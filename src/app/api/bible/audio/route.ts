import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { getSessionUser } from "@/lib/auth";
import { BIBLE_BOOKS, parseScriptureReference } from "@/lib/bible-books";
import { AudioBibleTrack, BibleAudioResponse } from "@/lib/types";

const API_BIBLE_WEB_DRAMA_NT_ID = "105a06b6146d11e7-01";

interface CachedAudio {
  data: BibleAudioResponse;
  cachedAtMs: number;
  maxAgeMs: number;
}

const audioCache = new Map<string, CachedAudio>();

function getCachedAudio(cacheKey: string): BibleAudioResponse | null {
  const entry = audioCache.get(cacheKey);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.cachedAtMs > entry.maxAgeMs) {
    audioCache.delete(cacheKey);
    return null;
  }
  if (entry.data.expiresAt && now / 1000 >= entry.data.expiresAt - 120) {
    audioCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedAudio(
  cacheKey: string,
  data: BibleAudioResponse,
  maxAgeMs: number
) {
  if (audioCache.size > 150) {
    const oldest = audioCache.keys().next().value;
    if (oldest) audioCache.delete(oldest);
  }
  audioCache.set(cacheKey, { data, cachedAtMs: Date.now(), maxAgeMs });
}

function resolveServerEnv(name: string): string | null {
  const cfEnv = env as unknown as Record<string, string | undefined>;
  return cfEnv?.[name]?.trim() || process.env[name]?.trim() || null;
}

function resolveEsvKey(request: Request, isAdmin: boolean): {
  key: string | null;
  fromHeader: boolean;
} {
  if (isAdmin) {
    const headerKey = request.headers.get("x-esv-api-key")?.trim();
    if (headerKey) return { key: headerKey, fromHeader: true };
  }
  return { key: resolveServerEnv("ESV_API_KEY"), fromHeader: false };
}

function buildSuggestions(
  currentTranslation: string,
  isNewTestament: boolean,
  hasEsvKey: boolean,
  hasApiBibleKey: boolean
): string[] {
  const options: string[] = [];
  if (hasEsvKey) options.push("esv");
  options.push("bsb", "kjv");
  if (isNewTestament && hasApiBibleKey) options.push("web");
  return options.filter((t) => t !== currentTranslation);
}

const BSB_READER_META: Record<string, { label: string; narrator: string; order: number }> = {
  hays: { label: "Barry Hays", narrator: "Barry Hays (BSB)", order: 1 },
  souer: { label: "Bob Souer", narrator: "Bob Souer (BSB)", order: 2 },
  david: { label: "David", narrator: "David (BSB)", order: 3 },
};

async function fetchHelloAoAudio(
  helloAoId: string,
  translation: "bsb" | "kjv",
  usfm: string,
  chapter: number,
  reference: string
): Promise<BibleAudioResponse> {
  const url = `https://bible.helloao.org/api/${encodeURIComponent(
    helloAoId
  )}/${encodeURIComponent(usfm)}/${chapter}.json`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(
      `Could not load ${translation.toUpperCase()} audio metadata (${res.status}).`
    );
  }

  const json = (await res.json()) as {
    thisChapterAudioLinks?: Record<string, string>;
  };

  const links = json.thisChapterAudioLinks || {};
  const tracks: AudioBibleTrack[] = Object.entries(links)
    .filter(([, href]) => typeof href === "string" && href.startsWith("https://"))
    .map(([readerId, href]) => {
      if (translation === "bsb") {
        const meta = BSB_READER_META[readerId.toLowerCase()];
        const fallbackName =
          readerId.charAt(0).toUpperCase() + readerId.slice(1);
        return {
          id: readerId,
          label: meta?.label || fallbackName,
          narrator: meta?.narrator || `${fallbackName} (BSB)`,
          url: href,
          source: "helloao" as const,
        };
      }
      return {
        id: readerId,
        label:
          readerId === "wordproject"
            ? "KJV Studio Audio"
            : readerId.charAt(0).toUpperCase() + readerId.slice(1),
        narrator:
          readerId === "wordproject" ? "WordProject (KJV)" : `${readerId} (KJV)`,
        url: href,
        source: "helloao" as const,
      };
    });

  if (translation === "bsb") {
    tracks.sort((a, b) => {
      const oa = BSB_READER_META[a.id.toLowerCase()]?.order ?? 99;
      const ob = BSB_READER_META[b.id.toLowerCase()]?.order ?? 99;
      return oa - ob;
    });
  }

  return {
    available: tracks.length > 0,
    reference,
    translation,
    tracks,
    ...(tracks.length === 0
      ? {
          reason: `No studio audio track was returned for ${reference} (${translation.toUpperCase()}).`,
        }
      : {}),
  };
}

async function fetchEsvAudio(
  passage: string,
  apiKey: string
): Promise<BibleAudioResponse> {
  const res = await fetch(
    `https://api.esv.org/v3/passage/audio/?q=${encodeURIComponent(passage)}`,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    }
  );

  if (res.status === 401 || res.status === 403) {
    return {
      available: false,
      reference: passage,
      translation: "esv",
      tracks: [],
      reason: "ESV API key was rejected for audio playback. Using Device Read-Aloud.",
    };
  }

  const location = res.headers.get("location");
  if (location) {
    const resolvedUrl = new URL(location, "https://api.esv.org").toString();
    if (resolvedUrl.startsWith("https://")) {
      return {
        available: true,
        reference: passage,
        translation: "esv",
        tracks: [
          {
            id: "esv-studio",
            label: "ESV Studio Audio",
            narrator: "Crossway ESV",
            url: resolvedUrl,
            source: "esv",
          },
        ],
      };
    }
  }

  return {
    available: false,
    reference: passage,
    translation: "esv",
    tracks: [],
    reason: `ESV studio audio is temporarily unavailable for ${passage}. Using Device Read-Aloud.`,
  };
}

async function fetchApiBibleWebAudio(
  usfm: string,
  chapter: number,
  reference: string,
  apiKey: string
): Promise<BibleAudioResponse> {
  const chapterId = `${usfm}.${chapter}`;
  const res = await fetch(
    `https://rest.api.bible/v1/audio-bibles/${API_BIBLE_WEB_DRAMA_NT_ID}/chapters/${encodeURIComponent(
      chapterId
    )}`,
    {
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    return {
      available: false,
      reference,
      translation: "web",
      tracks: [],
      reason: `WEB dramatized audio is unavailable for ${reference} (${res.status}). Using Device Read-Aloud.`,
    };
  }

  const payload = (await res.json()) as {
    data?: {
      resourceUrl?: string;
      expiresAt?: string | number;
    };
  };

  const resourceUrl = payload.data?.resourceUrl;
  const expiresAt = payload.data?.expiresAt
    ? Number(payload.data.expiresAt)
    : undefined;

  if (!resourceUrl || !resourceUrl.startsWith("https://")) {
    return {
      available: false,
      reference,
      translation: "web",
      tracks: [],
      reason: `No WEB audio URL returned for ${reference}. Using Device Read-Aloud.`,
    };
  }

  return {
    available: true,
    reference,
    translation: "web",
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    tracks: [
      {
        id: "web13-drama",
        label: "WEB Dramatized NT",
        narrator: "World English Bible (Drama NT)",
        url: resourceUrl,
        source: "api-bible",
        dramatized: true,
      },
    ],
  };
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const passage = searchParams.get("passage")?.trim() || "John 15";
    const translation =
      searchParams.get("translation")?.trim().toLowerCase() || "bsb";

    const parsed = parseScriptureReference(passage);
    if (!parsed) {
      return NextResponse.json(
        { error: `Could not recognize Bible passage "${passage}".` },
        { status: 400 }
      );
    }

    const bookMeta = BIBLE_BOOKS.find((b) => b.name === parsed.book);
    const isNewTestament = bookMeta?.testament === "NT";
    const reference = `${parsed.book} ${parsed.chapter}`;

    const esvResolved = resolveEsvKey(request, user.role === "admin");
    const apiBibleKey = resolveServerEnv("API_BIBLE_KEY");
    const suggestions = buildSuggestions(
      translation,
      isNewTestament,
      Boolean(esvResolved.key),
      Boolean(apiBibleKey)
    );

    if (translation === "bsb" || translation === "kjv") {
      const cacheKey = `${translation}::${parsed.usfm}.${parsed.chapter}`;
      const cached = getCachedAudio(cacheKey);
      if (cached) return NextResponse.json(cached);

      const helloId = translation === "bsb" ? "BSB" : "eng_kjv";
      const data = await fetchHelloAoAudio(
        helloId,
        translation,
        parsed.usfm,
        parsed.chapter,
        reference
      );
      if (!data.available) {
        data.suggestedStudioTranslations = suggestions;
      } else {
        setCachedAudio(cacheKey, data, 60 * 60 * 1000);
      }
      return NextResponse.json(data);
    }

    if (translation === "esv") {
      if (!esvResolved.key) {
        return NextResponse.json<BibleAudioResponse>({
          available: false,
          reference,
          translation: "esv",
          tracks: [],
          reason:
            "ESV API key isn't configured yet. Listen with Device Read-Aloud or switch to BSB/KJV studio audio.",
          suggestedStudioTranslations: suggestions,
        });
      }

      const cacheKey = `esv::${parsed.usfm}.${parsed.chapter}`;
      if (!esvResolved.fromHeader) {
        const cached = getCachedAudio(cacheKey);
        if (cached) return NextResponse.json(cached);
      }

      const data = await fetchEsvAudio(reference, esvResolved.key);
      if (!data.available) {
        data.suggestedStudioTranslations = suggestions;
      } else if (!esvResolved.fromHeader) {
        setCachedAudio(cacheKey, data, 15 * 60 * 1000);
      }
      return NextResponse.json(data);
    }

    if (translation === "web") {
      if (!isNewTestament) {
        return NextResponse.json<BibleAudioResponse>({
          available: false,
          reference,
          translation: "web",
          tracks: [],
          reason:
            "WEB dramatized studio audio covers the New Testament. Listening with Device Read-Aloud, or switch to ESV, BSB, or KJV for Old Testament studio audio.",
          suggestedStudioTranslations: suggestions,
        });
      }
      if (!apiBibleKey) {
        return NextResponse.json<BibleAudioResponse>({
          available: false,
          reference,
          translation: "web",
          tracks: [],
          reason:
            "API.Bible key isn't configured for WEB audio. Using Device Read-Aloud.",
          suggestedStudioTranslations: suggestions,
        });
      }

      const cacheKey = `web::${parsed.usfm}.${parsed.chapter}`;
      const cached = getCachedAudio(cacheKey);
      if (cached) return NextResponse.json(cached);

      const data = await fetchApiBibleWebAudio(
        parsed.usfm,
        parsed.chapter,
        reference,
        apiBibleKey
      );
      if (!data.available) {
        data.suggestedStudioTranslations = suggestions;
      } else {
        setCachedAudio(cacheKey, data, 10 * 60 * 1000);
      }
      return NextResponse.json(data);
    }

    // NIV, NLT, NASB, ASV, BBE — free API tier is text-only; instruct player to use Device Read-Aloud
    return NextResponse.json<BibleAudioResponse>({
      available: false,
      reference,
      translation,
      tracks: [],
      reason: `${translation.toUpperCase()} studio audio isn't included on the free Bible API tier — using Device Read-Aloud.`,
      suggestedStudioTranslations: suggestions,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load Audio Bible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
