import { NextResponse } from "next/server";
import { BibleChapterResponse } from "@/lib/types";

const chapterCache = new Map<string, BibleChapterResponse>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const passage = searchParams.get("passage")?.trim() || "John 15";
    const translation = searchParams.get("translation")?.trim().toLowerCase() || "web";

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
      next: { revalidate: 86400 },
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

    // Keep cache bounded
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
