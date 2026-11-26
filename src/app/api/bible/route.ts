import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { BibleChapterResponse, BibleVerse } from "@/lib/types";
import { parseScriptureReference } from "@/lib/bible-books";

const chapterCache = new Map<string, BibleChapterResponse>();

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const passage = searchParams.get("passage")?.trim() || "John 15";
    const translation =
      searchParams.get("translation")?.trim().toLowerCase() || "web";

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

    const url = `https://bible-api.com/${encodeURIComponent(
      passage
    )}?translation=${encodeURIComponent(translation)}`;

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
