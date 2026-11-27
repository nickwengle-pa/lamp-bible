import { BIBLE_BOOKS } from "./bible-books";

export interface DetectedScriptureRef {
  /** Exact matched display string as written by the user (e.g. "Jn 1:1" or "John 1:1") */
  matchText: string;
  /** Canonical reference guaranteed to parse cleanly (e.g. "John 1:1") */
  canonical: string;
  book: string;
  chapter: number;
  verse?: number;
}

/**
 * Common English Bible book aliases mapped to canonical BIBLE_BOOKS names.
 * Only unambiguous aliases are included; ambiguous short words require a ":verse" suffix.
 */
const BOOK_ALIASES: Record<string, string> = {
  // OT
  genesis: "Genesis",
  gen: "Genesis",
  ge: "Genesis",
  exodus: "Exodus",
  exod: "Exodus",
  exo: "Exodus",
  ex: "Exodus",
  leviticus: "Leviticus",
  lev: "Leviticus",
  numbers: "Numbers",
  num: "Numbers",
  deuteronomy: "Deuteronomy",
  deut: "Deuteronomy",
  dt: "Deuteronomy",
  joshua: "Joshua",
  josh: "Joshua",
  judges: "Judges",
  judg: "Judges",
  jdg: "Judges",
  ruth: "Ruth",
  "1 samuel": "1 Samuel",
  "1 sam": "1 Samuel",
  "1sam": "1 Samuel",
  "2 samuel": "2 Samuel",
  "2 sam": "2 Samuel",
  "2sam": "2 Samuel",
  "1 kings": "1 Kings",
  "1 kgs": "1 Kings",
  "1kgs": "1 Kings",
  "1 ki": "1 Kings",
  "2 kings": "2 Kings",
  "2 kgs": "2 Kings",
  "2kgs": "2 Kings",
  "2 ki": "2 Kings",
  "1 chronicles": "1 Chronicles",
  "1 chron": "1 Chronicles",
  "1 chr": "1 Chronicles",
  "1chr": "1 Chronicles",
  "2 chronicles": "2 Chronicles",
  "2 chron": "2 Chronicles",
  "2 chr": "2 Chronicles",
  "2chr": "2 Chronicles",
  ezra: "Ezra",
  nehemiah: "Nehemiah",
  neh: "Nehemiah",
  esther: "Esther",
  esth: "Esther",
  job: "Job",
  psalms: "Psalms",
  psalm: "Psalms",
  psa: "Psalms",
  ps: "Psalms",
  proverbs: "Proverbs",
  prov: "Proverbs",
  pro: "Proverbs",
  pr: "Proverbs",
  ecclesiastes: "Ecclesiastes",
  eccles: "Ecclesiastes",
  eccl: "Ecclesiastes",
  ecc: "Ecclesiastes",
  "song of solomon": "Song of Solomon",
  "song of songs": "Song of Solomon",
  song: "Song of Solomon",
  sos: "Song of Solomon",
  isaiah: "Isaiah",
  isa: "Isaiah",
  jeremiah: "Jeremiah",
  jer: "Jeremiah",
  lamentations: "Lamentations",
  lam: "Lamentations",
  ezekiel: "Ezekiel",
  ezek: "Ezekiel",
  ezk: "Ezekiel",
  daniel: "Daniel",
  dan: "Daniel",
  hosea: "Hosea",
  hos: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadiah: "Obadiah",
  obad: "Obadiah",
  jonah: "Jonah",
  jon: "Jonah",
  micah: "Micah",
  mic: "Micah",
  nahum: "Nahum",
  nah: "Nahum",
  habakkuk: "Habakkuk",
  hab: "Habakkuk",
  zephaniah: "Zephaniah",
  zeph: "Zephaniah",
  zep: "Zephaniah",
  haggai: "Haggai",
  hag: "Haggai",
  zechariah: "Zechariah",
  zech: "Zechariah",
  zec: "Zechariah",
  malachi: "Malachi",
  mal: "Malachi",
  // NT
  matthew: "Matthew",
  matt: "Matthew",
  mat: "Matthew",
  mt: "Matthew",
  mark: "Mark",
  mrk: "Mark",
  mk: "Mark",
  luke: "Luke",
  luk: "Luke",
  lk: "Luke",
  john: "John",
  jhn: "John",
  jn: "John",
  acts: "Acts",
  romans: "Romans",
  rom: "Romans",
  "1 corinthians": "1 Corinthians",
  "1 cor": "1 Corinthians",
  "1cor": "1 Corinthians",
  "2 corinthians": "2 Corinthians",
  "2 cor": "2 Corinthians",
  "2cor": "2 Corinthians",
  galatians: "Galatians",
  gal: "Galatians",
  ephesians: "Ephesians",
  eph: "Ephesians",
  philippians: "Philippians",
  phil: "Philippians",
  php: "Philippians",
  colossians: "Colossians",
  col: "Colossians",
  "1 thessalonians": "1 Thessalonians",
  "1 thess": "1 Thessalonians",
  "1 thes": "1 Thessalonians",
  "1thess": "1 Thessalonians",
  "2 thessalonians": "2 Thessalonians",
  "2 thess": "2 Thessalonians",
  "2 thes": "2 Thessalonians",
  "2thess": "2 Thessalonians",
  "1 timothy": "1 Timothy",
  "1 tim": "1 Timothy",
  "1tim": "1 Timothy",
  "2 timothy": "2 Timothy",
  "2 tim": "2 Timothy",
  "2tim": "2 Timothy",
  titus: "Titus",
  tit: "Titus",
  philemon: "Philemon",
  phlm: "Philemon",
  phm: "Philemon",
  hebrews: "Hebrews",
  heb: "Hebrews",
  james: "James",
  jas: "James",
  "1 peter": "1 Peter",
  "1 pet": "1 Peter",
  "1pet": "1 Peter",
  "1 pe": "1 Peter",
  "2 peter": "2 Peter",
  "2 pet": "2 Peter",
  "2pet": "2 Peter",
  "2 pe": "2 Peter",
  "1 john": "1 John",
  "1 jn": "1 John",
  "1jn": "1 John",
  "1 jhn": "1 John",
  "2 john": "2 John",
  "2 jn": "2 John",
  "2jn": "2 John",
  "2 jhn": "2 John",
  "3 john": "3 John",
  "3 jn": "3 John",
  "3jn": "3 John",
  "3 jhn": "3 John",
  jude: "Jude",
  revelation: "Revelation",
  revelations: "Revelation",
  rev: "Revelation",
};

/**
 * Aliases that are everyday English words or very short abbreviations —
 * only auto-link these when an explicit ":verse" is present (e.g., "Job 1:1", "Mark 2:5")
 * so prose like "Job 1 was hard" or "ex 2" is never falsely linked.
 */
const REQUIRE_VERSE_COLON = new Set([
  "ge",
  "ex",
  "dt",
  "pr",
  "mt",
  "mk",
  "lk",
  "jn",
  "job",
  "song",
  "acts",
  "numbers",
  "judges",
  "ruth",
  "mark",
  "jon",
  "pro",
  "tit",
  "sos",
]);

const BOOK_CHAPTERS_MAP = new Map<string, number>(
  BIBLE_BOOKS.map((b) => [b.name, b.chapters])
);

const ESCAPED_ALIASES = Object.keys(BOOK_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));

// Matches Book + Chapter + optional :Verse(s) (including ranges like 1:1-5 or 1:1–5)
const SCRIPTURE_REGEX = new RegExp(
  `(?<![A-Za-z0-9])(${ESCAPED_ALIASES.join("|")})\\.?\\s+(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*[-–—]\\s*\\d{1,3})?)?(?![A-Za-z0-9:])`,
  "gi"
);

const NON_CHAPTER_FOLLOWERS =
  /^\s+(?:am|pm|days?|weeks?|months?|years?|hours?|minutes?|mins?|seconds?|secs?|times?|people|things?|percent|%|st|nd|rd|th)\b/i;

function resolveMatch(
  rawBook: string,
  chapterStr: string,
  verseStr: string | undefined,
  trailingText: string
): Omit<DetectedScriptureRef, "matchText"> | null {
  const key = rawBook.toLowerCase().replace(/\s+/g, " ").trim();
  const canonicalBook = BOOK_ALIASES[key];
  if (!canonicalBook) return null;

  const maxChapters = BOOK_CHAPTERS_MAP.get(canonicalBook);
  if (!maxChapters) return null;

  const chapter = parseInt(chapterStr, 10);
  if (!Number.isFinite(chapter) || chapter < 1 || chapter > maxChapters) {
    return null;
  }

  if (verseStr) {
    const verse = parseInt(verseStr, 10);
    if (!Number.isFinite(verse) || verse < 1 || verse > 176) {
      return null;
    }
    return {
      canonical: `${canonicalBook} ${chapter}:${verse}`,
      book: canonicalBook,
      chapter,
      verse,
    };
  }

  // Chapter-only reference (e.g. "John 15" or "Romans 8")
  if (REQUIRE_VERSE_COLON.has(key)) return null;
  if (NON_CHAPTER_FOLLOWERS.test(trailingText)) return null;

  return {
    canonical: `${canonicalBook} ${chapter}`,
    book: canonicalBook,
    chapter,
  };
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Extracts unique Scripture references mentioned in plain text (useful for live chips inside Note Studio).
 */
export function extractScriptureReferences(text: string): DetectedScriptureRef[] {
  if (!text) return [];
  const results: DetectedScriptureRef[] = [];
  const seen = new Set<string>();

  SCRIPTURE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    const [full, rawBook, chapterStr, verseStr] = match;
    const trailing = text.slice(match.index + full.length, match.index + full.length + 24);
    const resolved = resolveMatch(rawBook, chapterStr, verseStr, trailing);
    if (!resolved) continue;
    if (!seen.has(resolved.canonical)) {
      seen.add(resolved.canonical);
      results.push({ matchText: full, ...resolved });
    }
  }
  return results;
}

/**
 * Turns Scripture references inside already-sanitized rich note HTML into
 * clickable `.lamp-scripture-link` elements while strictly leaving all HTML tags untouched.
 */
export function linkifyScriptureInHtml(safeHtml: string): string {
  if (!safeHtml) return "";

  const segments = safeHtml.split(/(<[^>]+>)/g);
  let insideLinkDepth = 0;

  return segments
    .map((segment, idx) => {
      // Odd indices are HTML tags
      if (idx % 2 === 1) {
        if (/^<span\b[^>]*class="[^"]*lamp-scripture-link/i.test(segment)) {
          insideLinkDepth += 1;
        } else if (insideLinkDepth > 0 && /^<\/span\s*>/i.test(segment)) {
          insideLinkDepth -= 1;
        }
        return segment;
      }

      if (!segment || insideLinkDepth > 0) return segment;

      SCRIPTURE_REGEX.lastIndex = 0;
      return segment.replace(
        SCRIPTURE_REGEX,
        (full, rawBook: string, chapterStr: string, verseStr: string | undefined, offset: number) => {
          const trailing = segment.slice(offset + full.length, offset + full.length + 24);
          const resolved = resolveMatch(rawBook, chapterStr, verseStr, trailing);
          if (!resolved) return full;

          const refAttr = escapeAttr(resolved.canonical);
          const titleAttr = escapeAttr(`Open ${resolved.canonical} in Bible Reader`);
          return `<span role="button" tabindex="0" data-scripture-ref="${refAttr}" title="${titleAttr}" class="lamp-scripture-link">${full}</span>`;
        }
      );
    })
    .join("");
}
