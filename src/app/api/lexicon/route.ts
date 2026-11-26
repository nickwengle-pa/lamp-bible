import { NextResponse } from "next/server";

export interface LexiconEntry {
  strongs: string;
  lexeme: string;
  transliteration: string;
  pronunciation: string;
  shortDefinition: string;
  definitionLines: string[];
}

interface RawBollsEntry {
  topic?: string;
  lexeme?: string;
  transliteration?: string;
  pronunciation?: string;
  short_definition?: string;
  definition?: string;
}

const lexiconCache = new Map<string, LexiconEntry[]>();

function cleanHtmlDefinition(html?: string): string[] {
  if (!html) return [];
  const withBreaks = html
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return withBreaks
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && line !== "-" && line !== "- Definition:");
}

function normalizeStrongsQuery(raw: string): string {
  const trimmed = raw.trim();
  // Bolls uses G3056 or H430 (strip leading zeros after G/H, e.g. G0746 -> G746)
  const match = trimmed.match(/^([GHgh])0*(\d+)$/);
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q")?.trim();
    if (!rawQuery) {
      return NextResponse.json(
        { error: "Please enter a Strong's number (e.g. G3056) or word to look up." },
        { status: 400 }
      );
    }

    const normalized = normalizeStrongsQuery(rawQuery);
    const cacheKey = normalized.toLowerCase();
    const cached = lexiconCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ query: normalized, entries: cached });
    }

    const res = await fetch(
      `https://bolls.life/dictionary-definition/BDBT/${encodeURIComponent(
        normalized
      )}/`,
      { headers: { Accept: "application/json" } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Lexicon lookup failed (${res.status}).` },
        { status: res.status }
      );
    }

    const raw = (await res.json()) as RawBollsEntry[];
    const entries: LexiconEntry[] = (Array.isArray(raw) ? raw : [])
      .slice(0, 10)
      .map((item) => ({
        strongs: item.topic || normalized,
        lexeme: item.lexeme || "",
        transliteration: item.transliteration || "",
        pronunciation: item.pronunciation || "",
        shortDefinition: item.short_definition || "",
        definitionLines: cleanHtmlDefinition(item.definition),
      }));

    if (lexiconCache.size > 200) {
      const firstKey = lexiconCache.keys().next().value;
      if (firstKey) lexiconCache.delete(firstKey);
    }
    lexiconCache.set(cacheKey, entries);

    return NextResponse.json({ query: normalized, entries });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to look up lexicon entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
