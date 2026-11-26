import { NextResponse } from "next/server";
import { parseScriptureReference } from "@/lib/bible-books";

export interface InterlinearWord {
  pos: number;
  language: "greek" | "hebrew" | string;
  text: string;
  transliteration: string;
  parsing: string;
  parsingFull: string;
  strongs: string;
  gloss: string;
}

interface RawChapterInterlinear {
  chapter?: {
    content?: Array<{
      verse: number;
      words: InterlinearWord[];
    }>;
  };
}

const chapterCache = new Map<string, Map<number, InterlinearWord[]>>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const passage = searchParams.get("passage")?.trim() || "John 1:1";
    const parsed = parseScriptureReference(passage);

    if (!parsed) {
      return NextResponse.json(
        { error: `Could not parse passage "${passage}".` },
        { status: 400 }
      );
    }

    const cacheKey = `${parsed.usfm}:${parsed.chapter}`;
    let verseMap = chapterCache.get(cacheKey);

    if (!verseMap) {
      const url = `https://bible.helloao.org/api/d/bsb-interlinear/${encodeURIComponent(
        parsed.usfm
      )}/${parsed.chapter}.json`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Interlinear data unavailable for ${parsed.book} ${parsed.chapter}.` },
          { status: res.status }
        );
      }

      const data = (await res.json()) as RawChapterInterlinear;
      verseMap = new Map<number, InterlinearWord[]>();
      for (const entry of data.chapter?.content || []) {
        verseMap.set(entry.verse, entry.words || []);
      }

      if (chapterCache.size > 80) {
        const firstKey = chapterCache.keys().next().value;
        if (firstKey) chapterCache.delete(firstKey);
      }
      chapterCache.set(cacheKey, verseMap);
    }

    if (parsed.verse) {
      const words = verseMap.get(parsed.verse) || [];
      return NextResponse.json({
        reference: `${parsed.book} ${parsed.chapter}:${parsed.verse}`,
        words,
      });
    }

    const versesObj: Record<number, InterlinearWord[]> = {};
    verseMap.forEach((words, vNum) => {
      versesObj[vNum] = words;
    });
    return NextResponse.json({
      reference: `${parsed.book} ${parsed.chapter}`,
      verses: versesObj,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load interlinear data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
