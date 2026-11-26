import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { BibleChapterResponse, BibleVerse } from "@/lib/types";
import { BIBLE_BOOKS, parseScriptureReference } from "@/lib/bible-books";

const chapterCache = new Map<string, BibleChapterResponse>();

const API_BIBLE_VERSIONS: Record<string, { bibleId: string; name: string }> = {
  niv: {
    bibleId: "78a9f6124f344018-01",
    name: "New International Version (NIV)",
  },
  nlt: {
    bibleId: "d6e14a625393b4da-01",
    name: "New Living Translation (NLT)",
  },
  nasb: {
    bibleId: "a761ca71e0b3ddcf-01",
    name: "New American Standard Bible (NASB)",
  },
};

function resolveEsvKey(request: Request): string | null {
  const headerKey = request.headers.get("x-esv-api-key")?.trim();
  if (headerKey) return headerKey;
  const cfEnv = env as unknown as Record<string, string | undefined>;
  const cfKey = cfEnv?.ESV_API_KEY?.trim();
  if (cfKey) return cfKey;
  const envKey = process.env.ESV_API_KEY?.trim();
  if (envKey) return envKey;
  return null;
}

function resolveApiBibleKey(request: Request): string | null {
  const headerKey = request.headers.get("x-api-bible-key")?.trim();
  if (headerKey) return headerKey;
  const cfEnv = env as unknown as Record<string, string | undefined>;
  const cfKey = cfEnv?.API_BIBLE_KEY?.trim();
  if (cfKey) return cfKey;
  const envKey = process.env.API_BIBLE_KEY?.trim();
  if (envKey) return envKey;
  return null;
}

async function fetchApiBiblePassage(
  passage: string,
  translationId: string,
  apiKey: string
): Promise<BibleChapterResponse> {
  const meta = API_BIBLE_VERSIONS[translationId];
  if (!meta) {
    throw new Error(`Unsupported API.Bible translation "${translationId}".`);
  }
  const parsed = parseScriptureReference(passage);
  if (!parsed) {
    throw new Error(`Could not recognize Bible passage "${passage}".`);
  }

  const chapterId = `${parsed.usfm}.${parsed.chapter}`;
  const params = new URLSearchParams({
    "content-type": "text",
    "include-notes": "false",
    "include-titles": "false",
    "include-chapter-numbers": "false",
    "include-verse-numbers": "true",
    "include-verse-spans": "false",
  });

  const res = await fetch(
    `https://rest.api.bible/v1/bibles/${encodeURIComponent(
      meta.bibleId
    )}/chapters/${encodeURIComponent(chapterId)}?${params.toString()}`,
    {
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `API.Bible rejected your key for ${translationId.toUpperCase()}.`
    );
  }
  if (!res.ok) {
    throw new Error(
      `Could not load ${translationId.toUpperCase()} passage "${parsed.book} ${parsed.chapter}" (${res.status}).`
    );
  }

  const payload = (await res.json()) as {
    data?: {
      reference?: string;
      content?: string;
    };
  };

  const fullText = (payload.data?.content || "").trim();
  if (!fullText) {
    throw new Error(
      `No ${translationId.toUpperCase()} verses found for "${parsed.book} ${parsed.chapter}".`
    );
  }

  const verses = parseEsvVerses(fullText, parsed.book, parsed.chapter);
  return {
    reference: payload.data?.reference || `${parsed.book} ${parsed.chapter}`,
    translation_id: translationId,
    translation_name: meta.name,
    verses,
    text: verses.map((v) => v.text).join(" "),
  };
}

function parseEsvVerses(
  passageText: string,
  bookName: string,
  chapter: number
): BibleVerse[] {
  const normalized = passageText.replace(/\r\n/g, "\n").trim();
  const matches = Array.from(normalized.matchAll(/\[(\d+)\]\s*/g));

  if (matches.length === 0) {
    return normalized
      ? [
          {
            book_id: bookName.slice(0, 3).toUpperCase(),
            book_name: bookName,
            chapter,
            verse: 1,
            text: normalized,
          },
        ]
      : [];
  }

  const verses: BibleVerse[] = [];
  for (let i = 0; i < matches.length; i++) {
    const verseNum = parseInt(matches[i][1], 10);
    const startIdx = (matches[i].index ?? 0) + matches[i][0].length;
    const endIdx =
      i + 1 < matches.length ? matches[i + 1].index ?? normalized.length : normalized.length;
    const rawSlice = normalized
      .slice(startIdx, endIdx)
      .replace(/\s+/g, " ")
      .replace(/\(ESV\)\s*$/i, "")
      .trim();

    if (rawSlice) {
      verses.push({
        book_id: bookName.slice(0, 3).toUpperCase(),
        book_name: bookName,
        chapter,
        verse: verseNum,
        text: rawSlice,
      });
    }
  }

  return verses;
}

async function fetchEsvPassage(
  passage: string,
  apiKey: string
): Promise<BibleChapterResponse> {
  const params = new URLSearchParams({
    q: passage,
    "include-passage-references": "false",
    "include-verse-numbers": "true",
    "include-first-verse-numbers": "true",
    "include-footnotes": "false",
    "include-footnote-body": "false",
    "include-headings": "false",
    "include-short-copyright": "false",
    "include-copyright": "false",
    "indent-poetry": "false",
    "indent-paragraphs": "0",
  });

  const res = await fetch(
    `https://api.esv.org/v3/passage/text/?${params.toString()}`,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
        Accept: "application/json",
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "ESV API rejected your token. Check your ESV API key in Settings."
    );
  }
  if (!res.ok) {
    throw new Error(`ESV API error (${res.status}). Could not load "${passage}".`);
  }

  const payload = (await res.json()) as {
    canonical?: string;
    passages?: string[];
  };

  const fullText = (payload.passages || []).join("\n").trim();
  if (!fullText) {
    throw new Error(`No ESV passage found for "${passage}".`);
  }

  const parsed = parseScriptureReference(payload.canonical || passage);
  const bookName = parsed?.book || passage.replace(/\s+\d+.*$/, "");
  const chapter = parsed?.chapter || 1;
  const verses = parseEsvVerses(fullText, bookName, chapter);

  return {
    reference: payload.canonical || passage,
    translation_id: "esv",
    translation_name: "English Standard Version (ESV)",
    verses,
    text: fullText,
  };
}

async function fetchBsbPassage(passage: string): Promise<BibleChapterResponse> {
  const parsed = parseScriptureReference(passage);
  if (!parsed) {
    throw new Error(`Could not recognize Bible passage "${passage}".`);
  }

  const url = `https://bible.helloao.org/api/BSB/${encodeURIComponent(
    parsed.usfm
  )}/${parsed.chapter}.json`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `Could not load BSB passage "${parsed.book} ${parsed.chapter}" (${res.status}).`
    );
  }

  const payload = (await res.json()) as {
    chapter?: {
      content?: Array<{
        type?: string;
        number?: number;
        content?: Array<string | { text?: string; lineBreak?: boolean }>;
      }>;
    };
  };

  const rawItems = payload.chapter?.content || [];
  const verses: BibleVerse[] = [];

  for (const item of rawItems) {
    if (item.type !== "verse" || typeof item.number !== "number") continue;
    const parts: string[] = [];
    for (const piece of item.content || []) {
      if (typeof piece === "string") {
        parts.push(piece);
      } else if (piece && typeof piece.text === "string") {
        parts.push(piece.text);
      } else if (piece && piece.lineBreak) {
        parts.push(" ");
      }
    }
    const text = parts.join(" ").replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
    if (text) {
      verses.push({
        book_id: parsed.usfm,
        book_name: parsed.book,
        chapter: parsed.chapter,
        verse: item.number,
        text,
      });
    }
  }

  if (verses.length === 0) {
    throw new Error(`No BSB verses found for "${parsed.book} ${parsed.chapter}".`);
  }

  return {
    reference: `${parsed.book} ${parsed.chapter}`,
    translation_id: "bsb",
    translation_name: "Berean Standard Bible (BSB)",
    verses,
    text: verses.map((v) => v.text).join(" "),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const passage = searchParams.get("passage")?.trim() || "John 15";
    const translation =
      searchParams.get("translation")?.trim().toLowerCase() || "bsb";

    if (translation in API_BIBLE_VERSIONS) {
      const apiBibleKey = resolveApiBibleKey(request);
      if (!apiBibleKey) {
        return NextResponse.json(
          {
            error: `API.Bible key is not configured for ${translation.toUpperCase()}.`,
          },
          { status: 400 }
        );
      }

      const cacheKey = `${translation}::${passage.toLowerCase()}`;
      const cached = chapterCache.get(cacheKey);
      if (cached) return NextResponse.json(cached);

      const data = await fetchApiBiblePassage(passage, translation, apiBibleKey);
      if (chapterCache.size > 200) {
        const firstKey = chapterCache.keys().next().value;
        if (firstKey) chapterCache.delete(firstKey);
      }
      chapterCache.set(cacheKey, data);
      return NextResponse.json(data);
    }

    if (translation === "bsb") {
      const cacheKey = `bsb::${passage.toLowerCase()}`;
      const cached = chapterCache.get(cacheKey);
      if (cached) return NextResponse.json(cached);

      const data = await fetchBsbPassage(passage);
      if (chapterCache.size > 150) {
        const firstKey = chapterCache.keys().next().value;
        if (firstKey) chapterCache.delete(firstKey);
      }
      chapterCache.set(cacheKey, data);
      return NextResponse.json(data);
    }

    if (translation === "esv") {
      const esvKey = resolveEsvKey(request);
      if (!esvKey) {
        return NextResponse.json(
          {
            error:
              "Add your free ESV API token in Settings to read the English Standard Version (ESV).",
          },
          { status: 400 }
        );
      }

      const cacheKey = `esv::${passage.toLowerCase()}`;
      const cached = chapterCache.get(cacheKey);
      if (cached) return NextResponse.json(cached);

      const data = await fetchEsvPassage(passage, esvKey);
      if (chapterCache.size > 150) {
        const firstKey = chapterCache.keys().next().value;
        if (firstKey) chapterCache.delete(firstKey);
      }
      chapterCache.set(cacheKey, data);
      return NextResponse.json(data);
    }

    const cacheKey = `${translation}::${passage.toLowerCase()}`;
    const cached = chapterCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const parsed = parseScriptureReference(passage);
    const matchedBook = parsed
      ? BIBLE_BOOKS.find((b) => b.name === parsed.book)
      : undefined;
    const isSingleChapterWholeBook = Boolean(
      parsed && matchedBook?.chapters === 1 && !parsed.verse
    );
    const queryPassage = isSingleChapterWholeBook
      ? `${parsed!.book} 1`
      : passage;

    const url = `https://bible-api.com/${encodeURIComponent(
      queryPassage
    )}?translation=${encodeURIComponent(translation)}${
      !passage.includes(":") ? "&single_chapter_book_matching=indifferent" : ""
    }`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not load passage "${passage}" (${res.status}).` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as BibleChapterResponse;
    if (!data.verses || data.verses.length === 0) {
      return NextResponse.json(
        { error: `No verses found for "${passage}".` },
        { status: 404 }
      );
    }

    if (chapterCache.size > 150) {
      const firstKey = chapterCache.keys().next().value;
      if (firstKey) chapterCache.delete(firstKey);
    }
    chapterCache.set(cacheKey, data);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch Bible passage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
