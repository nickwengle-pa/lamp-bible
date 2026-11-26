import { BibleBook } from "./types";

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament (39)
  { name: "Genesis", usfm: "GEN", chapters: 50, testament: "OT", category: "Law", abbr: "Gen" },
  { name: "Exodus", usfm: "EXO", chapters: 40, testament: "OT", category: "Law", abbr: "Exod" },
  { name: "Leviticus", usfm: "LEV", chapters: 27, testament: "OT", category: "Law", abbr: "Lev" },
  { name: "Numbers", usfm: "NUM", chapters: 36, testament: "OT", category: "Law", abbr: "Num" },
  { name: "Deuteronomy", usfm: "DEU", chapters: 34, testament: "OT", category: "Law", abbr: "Deut" },
  { name: "Joshua", usfm: "JOS", chapters: 24, testament: "OT", category: "History", abbr: "Josh" },
  { name: "Judges", usfm: "JDG", chapters: 21, testament: "OT", category: "History", abbr: "Judg" },
  { name: "Ruth", usfm: "RUT", chapters: 4, testament: "OT", category: "History", abbr: "Ruth" },
  { name: "1 Samuel", usfm: "1SA", chapters: 31, testament: "OT", category: "History", abbr: "1 Sam" },
  { name: "2 Samuel", usfm: "2SA", chapters: 24, testament: "OT", category: "History", abbr: "2 Sam" },
  { name: "1 Kings", usfm: "1KI", chapters: 22, testament: "OT", category: "History", abbr: "1 Kgs" },
  { name: "2 Kings", usfm: "2KI", chapters: 25, testament: "OT", category: "History", abbr: "2 Kgs" },
  { name: "1 Chronicles", usfm: "1CH", chapters: 29, testament: "OT", category: "History", abbr: "1 Chr" },
  { name: "2 Chronicles", usfm: "2CH", chapters: 36, testament: "OT", category: "History", abbr: "2 Chr" },
  { name: "Ezra", usfm: "EZR", chapters: 10, testament: "OT", category: "History", abbr: "Ezra" },
  { name: "Nehemiah", usfm: "NEH", chapters: 13, testament: "OT", category: "History", abbr: "Neh" },
  { name: "Esther", usfm: "EST", chapters: 10, testament: "OT", category: "History", abbr: "Esth" },
  { name: "Job", usfm: "JOB", chapters: 42, testament: "OT", category: "Wisdom", abbr: "Job" },
  { name: "Psalms", usfm: "PSA", chapters: 150, testament: "OT", category: "Wisdom", abbr: "Ps" },
  { name: "Proverbs", usfm: "PRO", chapters: 31, testament: "OT", category: "Wisdom", abbr: "Prov" },
  { name: "Ecclesiastes", usfm: "ECC", chapters: 12, testament: "OT", category: "Wisdom", abbr: "Eccl" },
  { name: "Song of Solomon", usfm: "SNG", chapters: 8, testament: "OT", category: "Wisdom", abbr: "Song" },
  { name: "Isaiah", usfm: "ISA", chapters: 66, testament: "OT", category: "Major Prophets", abbr: "Isa" },
  { name: "Jeremiah", usfm: "JER", chapters: 52, testament: "OT", category: "Major Prophets", abbr: "Jer" },
  { name: "Lamentations", usfm: "LAM", chapters: 5, testament: "OT", category: "Major Prophets", abbr: "Lam" },
  { name: "Ezekiel", usfm: "EZK", chapters: 48, testament: "OT", category: "Major Prophets", abbr: "Ezek" },
  { name: "Daniel", usfm: "DAN", chapters: 12, testament: "OT", category: "Major Prophets", abbr: "Dan" },
  { name: "Hosea", usfm: "HOS", chapters: 14, testament: "OT", category: "Minor Prophets", abbr: "Hos" },
  { name: "Joel", usfm: "JOL", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Joel" },
  { name: "Amos", usfm: "AMO", chapters: 9, testament: "OT", category: "Minor Prophets", abbr: "Amos" },
  { name: "Obadiah", usfm: "OBA", chapters: 1, testament: "OT", category: "Minor Prophets", abbr: "Obad" },
  { name: "Jonah", usfm: "JON", chapters: 4, testament: "OT", category: "Minor Prophets", abbr: "Jonah" },
  { name: "Micah", usfm: "MIC", chapters: 7, testament: "OT", category: "Minor Prophets", abbr: "Mic" },
  { name: "Nahum", usfm: "NAM", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Nah" },
  { name: "Habakkuk", usfm: "HAB", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Hab" },
  { name: "Zephaniah", usfm: "ZEP", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Zeph" },
  { name: "Haggai", usfm: "HAG", chapters: 2, testament: "OT", category: "Minor Prophets", abbr: "Hag" },
  { name: "Zechariah", usfm: "ZEC", chapters: 14, testament: "OT", category: "Minor Prophets", abbr: "Zech" },
  { name: "Malachi", usfm: "MAL", chapters: 4, testament: "OT", category: "Minor Prophets", abbr: "Mal" },
  // New Testament (27)
  { name: "Matthew", usfm: "MAT", chapters: 28, testament: "NT", category: "Gospels", abbr: "Matt" },
  { name: "Mark", usfm: "MRK", chapters: 16, testament: "NT", category: "Gospels", abbr: "Mark" },
  { name: "Luke", usfm: "LUK", chapters: 24, testament: "NT", category: "Gospels", abbr: "Luke" },
  { name: "John", usfm: "JHN", chapters: 21, testament: "NT", category: "Gospels", abbr: "John" },
  { name: "Acts", usfm: "ACT", chapters: 28, testament: "NT", category: "History", abbr: "Acts" },
  { name: "Romans", usfm: "ROM", chapters: 16, testament: "NT", category: "Pauline Epistles", abbr: "Rom" },
  { name: "1 Corinthians", usfm: "1CO", chapters: 16, testament: "NT", category: "Pauline Epistles", abbr: "1 Cor" },
  { name: "2 Corinthians", usfm: "2CO", chapters: 13, testament: "NT", category: "Pauline Epistles", abbr: "2 Cor" },
  { name: "Galatians", usfm: "GAL", chapters: 6, testament: "NT", category: "Pauline Epistles", abbr: "Gal" },
  { name: "Ephesians", usfm: "EPH", chapters: 6, testament: "NT", category: "Pauline Epistles", abbr: "Eph" },
  { name: "Philippians", usfm: "PHP", chapters: 4, testament: "NT", category: "Pauline Epistles", abbr: "Phil" },
  { name: "Colossians", usfm: "COL", chapters: 4, testament: "NT", category: "Pauline Epistles", abbr: "Col" },
  { name: "1 Thessalonians", usfm: "1TH", chapters: 5, testament: "NT", category: "Pauline Epistles", abbr: "1 Thess" },
  { name: "2 Thessalonians", usfm: "2TH", chapters: 3, testament: "NT", category: "Pauline Epistles", abbr: "2 Thess" },
  { name: "1 Timothy", usfm: "1TI", chapters: 6, testament: "NT", category: "Pauline Epistles", abbr: "1 Tim" },
  { name: "2 Timothy", usfm: "2TI", chapters: 4, testament: "NT", category: "Pauline Epistles", abbr: "2 Tim" },
  { name: "Titus", usfm: "TIT", chapters: 3, testament: "NT", category: "Pauline Epistles", abbr: "Titus" },
  { name: "Philemon", usfm: "PHM", chapters: 1, testament: "NT", category: "Pauline Epistles", abbr: "Phlm" },
  { name: "Hebrews", usfm: "HEB", chapters: 13, testament: "NT", category: "General Epistles", abbr: "Heb" },
  { name: "James", usfm: "JAS", chapters: 5, testament: "NT", category: "General Epistles", abbr: "Jas" },
  { name: "1 Peter", usfm: "1PE", chapters: 5, testament: "NT", category: "General Epistles", abbr: "1 Pet" },
  { name: "2 Peter", usfm: "2PE", chapters: 3, testament: "NT", category: "General Epistles", abbr: "2 Pet" },
  { name: "1 John", usfm: "1JN", chapters: 5, testament: "NT", category: "General Epistles", abbr: "1 John" },
  { name: "2 John", usfm: "2JN", chapters: 1, testament: "NT", category: "General Epistles", abbr: "2 John" },
  { name: "3 John", usfm: "3JN", chapters: 1, testament: "NT", category: "General Epistles", abbr: "3 John" },
  { name: "Jude", usfm: "JUD", chapters: 1, testament: "NT", category: "General Epistles", abbr: "Jude" },
  { name: "Revelation", usfm: "REV", chapters: 22, testament: "NT", category: "Prophecy", abbr: "Rev" },
];

export const BIBLE_TRANSLATIONS = [
  { id: "esv", name: "English Standard Version (ESV)", short: "ESV" },
  { id: "bsb", name: "Berean Standard Bible (BSB)", short: "BSB" },
  { id: "web", name: "World English Bible (WEB)", short: "WEB" },
  { id: "kjv", name: "King James Version (KJV)", short: "KJV" },
  { id: "asv", name: "American Standard Version (ASV)", short: "ASV" },
  { id: "bbe", name: "Bible in Basic English (BBE)", short: "BBE" },
];

export function parseScriptureReference(ref: string): {
  book: string;
  usfm: string;
  chapter: number;
  verse?: number;
} | null {
  const cleaned = ref.trim().replace(/\s+/g, " ");
  const match = cleaned.match(
    /^((?:[1-3]\s+)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+))?/i
  );
  if (!match) return null;

  const rawBook = match[1].toLowerCase().trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;

  const found = BIBLE_BOOKS.find((b) => {
    const lowerName = b.name.toLowerCase();
    const lowerAbbr = b.abbr.toLowerCase();
    if (lowerName === rawBook || lowerAbbr === rawBook) return true;
    if (rawBook === "psalm" && lowerName === "psalms") return true;
    if (lowerName.startsWith(rawBook) && rawBook.length >= 3) return true;
    return false;
  });

  if (!found) return null;
  const clampedChapter = Math.max(1, Math.min(found.chapters, chapter));
  return { book: found.name, usfm: found.usfm, chapter: clampedChapter, verse };
}
