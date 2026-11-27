import { BIBLE_BOOKS } from "./bible-books";

export interface DetectedScriptureRef {
  /** Exact matched display string as written by the user (e.g. "Jer 29:11" or "Gen. 1:1") */
  matchText: string;
  /** Canonical reference guaranteed to parse cleanly (e.g. "Jeremiah 29:11") */
  canonical: string;
  book: string;
  chapter: number;
  verse?: number;
}

function addNumberedBookAliases(
  map: Record<string, string>,
  num: 1 | 2 | 3,
  canonical: string,
  stems: string[]
) {
  const prefixes =
    num === 1
      ? ["1", "i", "1st"]
      : num === 2
      ? ["2", "ii", "2nd"]
      : ["3", "iii", "3rd"];

  for (const p of prefixes) {
    for (const stem of stems) {
      map[`${p} ${stem}`] = canonical;
      if (p === "1" || p === "2" || p === "3") {
        map[`${p}${stem}`] = canonical;
      }
    }
  }
}

/**
 * Comprehensive English Bible book & abbreviation dictionary (all 66 books):
 * covers full names, 3-4 letter church/ESV/NIV abbreviations, SBL 2-letter codes,
 * compact forms ("1Cor", "1Jn"), Roman numerals ("I Cor", "II Tim"), and ordinals ("1st John").
 */
export const BOOK_ALIASES: Record<string, string> = (() => {
  const m: Record<string, string> = {
    // Old Testament
    genesis: "Genesis",
    gen: "Genesis",
    gn: "Genesis",
    ge: "Genesis",
    exodus: "Exodus",
    exod: "Exodus",
    exo: "Exodus",
    ex: "Exodus",
    leviticus: "Leviticus",
    lev: "Leviticus",
    lv: "Leviticus",
    le: "Leviticus",
    numbers: "Numbers",
    num: "Numbers",
    nm: "Numbers",
    nu: "Numbers",
    nb: "Numbers",
    deuteronomy: "Deuteronomy",
    deut: "Deuteronomy",
    deu: "Deuteronomy",
    dt: "Deuteronomy",
    de: "Deuteronomy",
    joshua: "Joshua",
    josh: "Joshua",
    jos: "Joshua",
    jsh: "Joshua",
    judges: "Judges",
    judg: "Judges",
    jdgs: "Judges",
    jdg: "Judges",
    jg: "Judges",
    ruth: "Ruth",
    rth: "Ruth",
    ru: "Ruth",
    ezra: "Ezra",
    ezr: "Ezra",
    nehemiah: "Nehemiah",
    neh: "Nehemiah",
    ne: "Nehemiah",
    esther: "Esther",
    esth: "Esther",
    est: "Esther",
    es: "Esther",
    job: "Job",
    jb: "Job",
    psalms: "Psalms",
    psalm: "Psalms",
    psa: "Psalms",
    psm: "Psalms",
    pss: "Psalms",
    ps: "Psalms",
    proverbs: "Proverbs",
    prov: "Proverbs",
    pro: "Proverbs",
    prv: "Proverbs",
    pr: "Proverbs",
    ecclesiastes: "Ecclesiastes",
    eccles: "Ecclesiastes",
    eccl: "Ecclesiastes",
    ecc: "Ecclesiastes",
    ec: "Ecclesiastes",
    qoh: "Ecclesiastes",
    "song of solomon": "Song of Solomon",
    "song of songs": "Song of Solomon",
    canticles: "Song of Solomon",
    cant: "Song of Solomon",
    song: "Song of Solomon",
    sng: "Song of Solomon",
    sos: "Song of Solomon",
    sg: "Song of Solomon",
    isaiah: "Isaiah",
    isa: "Isaiah",
    is: "Isaiah",
    jeremiah: "Jeremiah",
    jerimiah: "Jeremiah",
    jer: "Jeremiah",
    jr: "Jeremiah",
    je: "Jeremiah",
    lamentations: "Lamentations",
    lam: "Lamentations",
    la: "Lamentations",
    ezekiel: "Ezekiel",
    ezek: "Ezekiel",
    eze: "Ezekiel",
    ezk: "Ezekiel",
    ez: "Ezekiel",
    daniel: "Daniel",
    dan: "Daniel",
    dn: "Daniel",
    da: "Daniel",
    hosea: "Hosea",
    hos: "Hosea",
    ho: "Hosea",
    joel: "Joel",
    joe: "Joel",
    jl: "Joel",
    amos: "Amos",
    amo: "Amos",
    am: "Amos",
    obadiah: "Obadiah",
    obad: "Obadiah",
    oba: "Obadiah",
    ob: "Obadiah",
    jonah: "Jonah",
    jon: "Jonah",
    jnh: "Jonah",
    micah: "Micah",
    mic: "Micah",
    mc: "Micah",
    nahum: "Nahum",
    nah: "Nahum",
    nam: "Nahum",
    na: "Nahum",
    habakkuk: "Habakkuk",
    hab: "Habakkuk",
    hb: "Habakkuk",
    zephaniah: "Zephaniah",
    zeph: "Zephaniah",
    zep: "Zephaniah",
    zp: "Zephaniah",
    haggai: "Haggai",
    hag: "Haggai",
    hg: "Haggai",
    zechariah: "Zechariah",
    zech: "Zechariah",
    zec: "Zechariah",
    zc: "Zechariah",
    malachi: "Malachi",
    mal: "Malachi",
    ml: "Malachi",

    // New Testament
    matthew: "Matthew",
    matt: "Matthew",
    mat: "Matthew",
    mt: "Matthew",
    mark: "Mark",
    mrk: "Mark",
    mk: "Mark",
    mr: "Mark",
    luke: "Luke",
    luk: "Luke",
    lk: "Luke",
    john: "John",
    jhn: "John",
    joh: "John",
    jn: "John",
    acts: "Acts",
    act: "Acts",
    ac: "Acts",
    romans: "Romans",
    rom: "Romans",
    rm: "Romans",
    ro: "Romans",
    galatians: "Galatians",
    gal: "Galatians",
    ga: "Galatians",
    ephesians: "Ephesians",
    ephes: "Ephesians",
    eph: "Ephesians",
    ep: "Ephesians",
    philippians: "Philippians",
    phil: "Philippians",
    php: "Philippians",
    phl: "Philippians",
    pp: "Philippians",
    colossians: "Colossians",
    col: "Colossians",
    co: "Colossians",
    titus: "Titus",
    tit: "Titus",
    ti: "Titus",
    philemon: "Philemon",
    philem: "Philemon",
    phile: "Philemon",
    phlm: "Philemon",
    phm: "Philemon",
    pm: "Philemon",
    hebrews: "Hebrews",
    heb: "Hebrews",
    he: "Hebrews",
    james: "James",
    jas: "James",
    jam: "James",
    jms: "James",
    jm: "James",
    jude: "Jude",
    jud: "Jude",
    jd: "Jude",
    revelation: "Revelation",
    revelations: "Revelation",
    rev: "Revelation",
    rv: "Revelation",
    re: "Revelation",
    apoc: "Revelation",
  };

  addNumberedBookAliases(m, 1, "1 Samuel", ["samuel", "sam", "sa", "sm"]);
  addNumberedBookAliases(m, 2, "2 Samuel", ["samuel", "sam", "sa", "sm"]);
  addNumberedBookAliases(m, 1, "1 Kings", ["kings", "king", "kgs", "kg", "ki"]);
  addNumberedBookAliases(m, 2, "2 Kings", ["kings", "king", "kgs", "kg", "ki"]);
  addNumberedBookAliases(m, 1, "1 Chronicles", ["chronicles", "chron", "chr", "ch"]);
  addNumberedBookAliases(m, 2, "2 Chronicles", ["chronicles", "chron", "chr", "ch"]);
  addNumberedBookAliases(m, 1, "1 Corinthians", ["corinthians", "cor", "co"]);
  addNumberedBookAliases(m, 2, "2 Corinthians", ["corinthians", "cor", "co"]);
  addNumberedBookAliases(m, 1, "1 Thessalonians", ["thessalonians", "thess", "thes", "th"]);
  addNumberedBookAliases(m, 2, "2 Thessalonians", ["thessalonians", "thess", "thes", "th"]);
  addNumberedBookAliases(m, 1, "1 Timothy", ["timothy", "tim", "tm", "ti"]);
  addNumberedBookAliases(m, 2, "2 Timothy", ["timothy", "tim", "tm", "ti"]);
  addNumberedBookAliases(m, 1, "1 Peter", ["peter", "pet", "pe", "pt"]);
  addNumberedBookAliases(m, 2, "2 Peter", ["peter", "pet", "pe", "pt"]);
  addNumberedBookAliases(m, 1, "1 John", ["john", "jhn", "joh", "jn"]);
  addNumberedBookAliases(m, 2, "2 John", ["john", "jhn", "joh", "jn"]);
  addNumberedBookAliases(m, 3, "3 John", ["john", "jhn", "joh", "jn"]);

  return m;
})();

export function resolveBookAlias(rawBook: string): string | null {
  const cleaned = rawBook
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  return BOOK_ALIASES[cleaned] || null;
}

/**
 * Short 2-letter codes or everyday English words that only auto-link in freeform
 * notes when an explicit ":verse" is present (e.g., "Is 53:5", "Am 5:24", "He 11:1",
 * "Job 1:1", "Mark 2:5"), avoiding false links in normal prose like "is 5" or "9 am".
 * Clear 3+ letter abbreviations like "Gen 1", "Jer 29", "Rom 8", "Ps 23" link both ways!
 */
const REQUIRE_VERSE_COLON = new Set([
  "gn",
  "ge",
  "ex",
  "lv",
  "le",
  "nm",
  "nu",
  "nb",
  "dt",
  "de",
  "jg",
  "ru",
  "ne",
  "es",
  "jb",
  "pr",
  "ec",
  "sg",
  "is",
  "jr",
  "je",
  "la",
  "ez",
  "dn",
  "da",
  "ho",
  "jl",
  "am",
  "ob",
  "mc",
  "na",
  "hb",
  "zp",
  "hg",
  "zc",
  "ml",
  "mt",
  "mk",
  "mr",
  "lk",
  "jn",
  "ac",
  "rm",
  "ro",
  "ga",
  "ep",
  "pp",
  "co",
  "ti",
  "pm",
  "he",
  "jm",
  "jd",
  "rv",
  "re",
  // Everyday English words / names that need ":verse" to avoid prose false positives
  "job",
  "song",
  "acts",
  "act",
  "numbers",
  "judges",
  "ruth",
  "mark",
  "jon",
  "joe",
  "pro",
  "tit",
  "sos",
  "est",
  "jam",
]);

const BOOK_CHAPTERS_MAP = new Map<string, number>(
  BIBLE_BOOKS.map((b) => [b.name, b.chapters])
);

const ESCAPED_ALIASES = Object.keys(BOOK_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((alias) =>
    alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
  );

// Uses a universal capturing-group prefix (no lookbehind) for 100% Safari/iOS compatibility.
// Matches Book/Abbrev + optional "." + Chapter + optional :Verse(s) (including ranges like 29:11-13)
const SCRIPTURE_REGEX = new RegExp(
  `(^|[^A-Za-z0-9])((${ESCAPED_ALIASES.join("|")})\\.?\\s+(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*[-–—]\\s*\\d{1,3})?)?)(?![A-Za-z0-9:])`,
  "gi"
);

function normalizeSpaces(input: string): string {
  return input.replace(/&nbsp;|&#160;|&#x0*a0;|\u00a0/gi, " ");
}

const NON_CHAPTER_FOLLOWERS =
  /^\s+(?:am|pm|days?|weeks?|months?|years?|hours?|minutes?|mins?|seconds?|secs?|times?|people|things?|percent|%|st|nd|rd|th)\b/i;

function resolveMatch(
  rawBook: string,
  chapterStr: string,
  verseStr: string | undefined,
  trailingText: string
): Omit<DetectedScriptureRef, "matchText"> | null {
  const key = rawBook.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  const canonicalBook = BOOK_ALIASES[key];
  if (!canonicalBook) return null;

  const maxChapters = BOOK_CHAPTERS_MAP.get(canonicalBook);
  if (!maxChapters) return null;

  const firstNum = parseInt(chapterStr, 10);
  if (!Number.isFinite(firstNum) || firstNum < 1) {
    return null;
  }

  if (verseStr) {
    if (firstNum > maxChapters) return null;
    const verse = parseInt(verseStr, 10);
    if (!Number.isFinite(verse) || verse < 1 || verse > 176) {
      return null;
    }
    return {
      canonical: `${canonicalBook} ${firstNum}:${verse}`,
      book: canonicalBook,
      chapter: firstNum,
      verse,
    };
  }

  // Single-chapter books written as "Jude 24" or "Phlm 6"
  if (maxChapters === 1 && firstNum > 1 && firstNum <= 25) {
    if (REQUIRE_VERSE_COLON.has(key) || NON_CHAPTER_FOLLOWERS.test(trailingText)) {
      return null;
    }
    return {
      canonical: `${canonicalBook} 1:${firstNum}`,
      book: canonicalBook,
      chapter: 1,
      verse: firstNum,
    };
  }

  // Chapter-only reference (e.g. "Gen 1", "Jer 29", "Romans 8", "Ps 23")
  if (firstNum > maxChapters) return null;
  if (REQUIRE_VERSE_COLON.has(key)) return null;
  if (NON_CHAPTER_FOLLOWERS.test(trailingText)) return null;

  return {
    canonical: `${canonicalBook} ${firstNum}`,
    book: canonicalBook,
    chapter: firstNum,
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
  const normalized = normalizeSpaces(text);
  const results: DetectedScriptureRef[] = [];
  const seen = new Set<string>();

  SCRIPTURE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCRIPTURE_REGEX.exec(normalized)) !== null) {
    const [full, prefix, matchText, rawBook, chapterStr, verseStr] = match;
    const matchEnd = match.index + full.length;
    const trailing = normalized.slice(matchEnd, matchEnd + 24);
    const resolved = resolveMatch(rawBook, chapterStr, verseStr, trailing);
    if (!resolved) {
      // Backtrack lastIndex slightly if prefix consumed a boundary character needed by the next match
      if (prefix) SCRIPTURE_REGEX.lastIndex = match.index + prefix.length;
      continue;
    }
    if (!seen.has(resolved.canonical)) {
      seen.add(resolved.canonical);
      results.push({ matchText, ...resolved });
    }
  }
  return results;
}

/**
 * Finds all Scripture matches with exact start/end character indices inside a plain text string.
 * Used by RichNoteModal to highlight & link references inline inside the live editor.
 */
export function findScriptureMatchesInText(
  text: string
): Array<DetectedScriptureRef & { start: number; end: number }> {
  if (!text) return [];
  const normalized = text.replace(/\u00a0/g, " ");
  const matches: Array<DetectedScriptureRef & { start: number; end: number }> = [];

  SCRIPTURE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCRIPTURE_REGEX.exec(normalized)) !== null) {
    const [full, prefix, matchText, rawBook, chapterStr, verseStr] = match;
    const start = match.index + prefix.length;
    const end = start + matchText.length;
    const trailing = normalized.slice(end, end + 24);
    const resolved = resolveMatch(rawBook, chapterStr, verseStr, trailing);
    if (!resolved) {
      if (prefix) SCRIPTURE_REGEX.lastIndex = start;
      continue;
    }
    matches.push({ matchText: text.slice(start, end), start, end, ...resolved });
  }
  return matches;
}

/**
 * Turns Scripture references inside already-sanitized rich note HTML into
 * clickable `.lamp-scripture-link` elements while strictly leaving all HTML tags untouched.
 */
export function linkifyScriptureInHtml(safeHtml: string): string {
  if (!safeHtml) return "";

  // Normalize any legacy &nbsp; entities and redundant empty spans before scanning
  let cleaned = normalizeSpaces(safeHtml);
  let prev = "";
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/<span>([^<]*)<\/span>/g, "$1");
  }

  const segments = cleaned.split(/(<[^>]+>)/g);
  let insideLinkDepth = 0;

  return segments
    .map((segment, idx) => {
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
        (
          full,
          prefix: string,
          matchText: string,
          rawBook: string,
          chapterStr: string,
          verseStr: string | undefined,
          offset: number
        ) => {
          const trailing = segment.slice(
            offset + full.length,
            offset + full.length + 24
          );
          const resolved = resolveMatch(rawBook, chapterStr, verseStr, trailing);
          if (!resolved) return full;

          const refAttr = escapeAttr(resolved.canonical);
          const titleAttr = escapeAttr(`Open ${resolved.canonical} in Bible Reader`);
          return `${prefix}<span role="button" tabindex="0" data-scripture-ref="${refAttr}" title="${titleAttr}" class="lamp-scripture-link">${matchText}</span>`;
        }
      );
    })
    .join("");
}
