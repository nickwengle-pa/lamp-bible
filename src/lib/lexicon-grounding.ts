import { parseScriptureReference } from "./bible-books";

export interface GroundedWordEntry {
  text: string;
  transliteration: string;
  strongs: string;
  language: string;
  parsing: string;
  gloss: string;
  shortDefinition?: string;
  definitionPreview?: string;
}

interface RawInterlinearWord {
  pos: number;
  language: string;
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
      words: RawInterlinearWord[];
    }>;
  };
}

interface RawBollsEntry {
  topic?: string;
  lexeme?: string;
  transliteration?: string;
  pronunciation?: string;
  short_definition?: string;
  definition?: string;
}

// High-frequency function words (articles, conjunctions, prepositions, pronouns) skipped when picking key study terms
const COMMON_FUNCTION_STRONGS = new Set([
  "G3588", // the
  "G2532", // and
  "G1161", // but/now
  "G1722", // in
  "G1519", // into
  "G1537", // out of
  "G1909", // upon
  "G4314", // toward
  "G3754", // that/because
  "G1063", // for
  "G846",  // he/she/it
  "G1473", // I
  "G4771", // you
  "G1510", // be
  "G3756", // not
  "G3361", // not
  "G3739", // who/which
  "G3778", // this
  "G2596", // according to
  "G1223", // through
  "G575",  // from
  "G3326", // with/after
  "H853",  // direct object marker
  "H9002", // b-
  "H9001", // l-
  "H9003", // k-
  "H9004", // m-
  "H9005", // h-
  "H9009", // w-
  "H3588", // ki
  "H834",  // asher
  "H413",  // el
  "H5921", // al
  "H4480", // min
  "H3808", // lo
  "H1961", // hayah
]);

function normalizeStrongs(raw: string): string {
  const m = raw.trim().match(/^([GHgh])0*(\d+)$/);
  if (m) return `${m[1].toUpperCase()}${m[2]}`;
  return raw.trim().toUpperCase();
}

function stripHtmlToSummary(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

/**
 * Fetches verified BSB interlinear words + Strong's/BDB/Thayer's lexicon definitions
 * for a single verse so AI verse insights are grounded in real original-language data.
 * Best-effort with short timeouts so upstream hiccups never break verse insights.
 */
export async function fetchGroundedVerseLexicon(
  reference: string
): Promise<GroundedWordEntry[]> {
  const parsed = parseScriptureReference(reference);
  if (!parsed || !parsed.verse) return [];

  try {
    const interlinearUrl = `https://bible.helloao.org/api/d/bsb-interlinear/${encodeURIComponent(
      parsed.usfm
    )}/${parsed.chapter}.json`;
    const res = await fetch(interlinearUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as RawChapterInterlinear;
    const verseEntry = (data.chapter?.content || []).find(
      (v) => v.verse === parsed.verse
    );
    const words = verseEntry?.words || [];
    if (words.length === 0) return [];

    // Select up to 4 unique, theologically meaningful words (avoiding articles/conjunctions)
    const seen = new Set<string>();
    const chosen: RawInterlinearWord[] = [];

    for (const w of words) {
      if (!w.strongs) continue;
      const code = normalizeStrongs(w.strongs);
      if (seen.has(code) || COMMON_FUNCTION_STRONGS.has(code)) continue;
      seen.add(code);
      chosen.push(w);
      if (chosen.length >= 4) break;
    }

    // Fallback: if a very short verse only had common words, take first 2 unique strongs
    if (chosen.length === 0) {
      for (const w of words) {
        if (!w.strongs) continue;
        const code = normalizeStrongs(w.strongs);
        if (seen.has(code)) continue;
        seen.add(code);
        chosen.push(w);
        if (chosen.length >= 2) break;
      }
    }

    const enriched = await Promise.all(
      chosen.map(async (w): Promise<GroundedWordEntry> => {
        const code = normalizeStrongs(w.strongs);
        const base: GroundedWordEntry = {
          text: w.text,
          transliteration: w.transliteration,
          strongs: code,
          language: w.language || (code.startsWith("G") ? "Greek" : "Hebrew"),
          parsing: w.parsingFull || w.parsing || "",
          gloss: w.gloss || "",
        };

        try {
          const lexRes = await fetch(
            `https://bolls.life/dictionary-definition/BDBT/${encodeURIComponent(
              code
            )}/`,
            {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(3000),
            }
          );
          if (lexRes.ok) {
            const entries = (await lexRes.json()) as RawBollsEntry[];
            const first = Array.isArray(entries) ? entries[0] : undefined;
            if (first) {
              base.shortDefinition = first.short_definition?.trim() || undefined;
              base.definitionPreview =
                stripHtmlToSummary(first.definition) || undefined;
            }
          }
        } catch {
          // Non-fatal: still keep verified interlinear gloss, strongs, and parsing
        }

        return base;
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

export function formatGroundedLexiconForPrompt(
  entries: GroundedWordEntry[]
): string {
  if (!entries.length) return "";
  const lines = entries.map((e) => {
    const defPart = [
      e.shortDefinition && `Short def: ${e.shortDefinition}`,
      e.definitionPreview && `BDB/Thayer's: ${e.definitionPreview}`,
    ]
      .filter(Boolean)
      .join(" | ");
    return `- ${e.text} (${e.transliteration}, ${e.language}, Strong's ${e.strongs}${
      e.parsing ? `, ${e.parsing}` : ""
    }) — Gloss: "${e.gloss}"${defPart ? ` — ${defPart}` : ""}`;
  });
  return `Verified Original-Language Interlinear & Strong's/BDB/Thayer's Lexicon Data (USE these exact words, Strong's numbers, and definitions — do NOT invent different ones):\n${lines.join(
    "\n"
  )}`;
}
