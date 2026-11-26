import { BibleBook } from "./types";

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament (39)
  { name: "Genesis", chapters: 50, testament: "OT", category: "Law", abbr: "Gen" },
  { name: "Exodus", chapters: 40, testament: "OT", category: "Law", abbr: "Exod" },
  { name: "Leviticus", chapters: 27, testament: "OT", category: "Law", abbr: "Lev" },
  { name: "Numbers", chapters: 36, testament: "OT", category: "Law", abbr: "Num" },
  { name: "Deuteronomy", chapters: 34, testament: "OT", category: "Law", abbr: "Deut" },
  { name: "Joshua", chapters: 24, testament: "OT", category: "History", abbr: "Josh" },
  { name: "Judges", chapters: 21, testament: "OT", category: "History", abbr: "Judg" },
  { name: "Ruth", chapters: 4, testament: "OT", category: "History", abbr: "Ruth" },
  { name: "1 Samuel", chapters: 31, testament: "OT", category: "History", abbr: "1 Sam" },
  { name: "2 Samuel", chapters: 24, testament: "OT", category: "History", abbr: "2 Sam" },
  { name: "1 Kings", chapters: 22, testament: "OT", category: "History", abbr: "1 Kgs" },
  { name: "2 Kings", chapters: 25, testament: "OT", category: "History", abbr: "2 Kgs" },
  { name: "1 Chronicles", chapters: 29, testament: "OT", category: "History", abbr: "1 Chr" },
  { name: "2 Chronicles", chapters: 36, testament: "OT", category: "History", abbr: "2 Chr" },
  { name: "Ezra", chapters: 10, testament: "OT", category: "History", abbr: "Ezra" },
  { name: "Nehemiah", chapters: 13, testament: "OT", category: "History", abbr: "Neh" },
  { name: "Esther", chapters: 10, testament: "OT", category: "History", abbr: "Esth" },
  { name: "Job", chapters: 42, testament: "OT", category: "Wisdom", abbr: "Job" },
  { name: "Psalms", chapters: 150, testament: "OT", category: "Wisdom", abbr: "Ps" },
  { name: "Proverbs", chapters: 31, testament: "OT", category: "Wisdom", abbr: "Prov" },
  { name: "Ecclesiastes", chapters: 12, testament: "OT", category: "Wisdom", abbr: "Eccl" },
  { name: "Song of Solomon", chapters: 8, testament: "OT", category: "Wisdom", abbr: "Song" },
  { name: "Isaiah", chapters: 66, testament: "OT", category: "Major Prophets", abbr: "Isa" },
  { name: "Jeremiah", chapters: 52, testament: "OT", category: "Major Prophets", abbr: "Jer" },
  { name: "Lamentations", chapters: 5, testament: "OT", category: "Major Prophets", abbr: "Lam" },
  { name: "Ezekiel", chapters: 48, testament: "OT", category: "Major Prophets", abbr: "Ezek" },
  { name: "Daniel", chapters: 12, testament: "OT", category: "Major Prophets", abbr: "Dan" },
  { name: "Hosea", chapters: 14, testament: "OT", category: "Minor Prophets", abbr: "Hos" },
  { name: "Joel", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Joel" },
  { name: "Amos", chapters: 9, testament: "OT", category: "Minor Prophets", abbr: "Amos" },
  { name: "Obadiah", chapters: 1, testament: "OT", category: "Minor Prophets", abbr: "Obad" },
  { name: "Jonah", chapters: 4, testament: "OT", category: "Minor Prophets", abbr: "Jonah" },
  { name: "Micah", chapters: 7, testament: "OT", category: "Minor Prophets", abbr: "Mic" },
  { name: "Nahum", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Nah" },
  { name: "Habakkuk", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Hab" },
  { name: "Zephaniah", chapters: 3, testament: "OT", category: "Minor Prophets", abbr: "Zeph" },
  { name: "Haggai", chapters: 2, testament: "OT", category: "Minor Prophets", abbr: "Hag" },
  { name: "Zechariah", chapters: 14, testament: "OT", category: "Minor Prophets", abbr: "Zech" },
  { name: "Malachi", chapters: 4, testament: "OT", category: "Minor Prophets", abbr: "Mal" },
  // New Testament (27)
  { name: "Matthew", chapters: 28, testament: "NT", category: "Gospels", abbr: "Matt" },
  { name: "Mark", chapters: 16, testament: "NT", category: "Gospels", abbr: "Mark" },
  { name: "Luke", chapters: 24, testament: "NT", category: "Gospels", abbr: "Luke" },
  { name: "John", chapters: 21, testament: "NT", category: "Gospels", abbr: "John" },
  { name: "Acts", chapters: 28, testament: "NT", category: "History", abbr: "Acts" },
  { name: "Romans", chapters: 16, testament: "NT", category: "Pauline Epistles", abbr: "Rom" },
  { name: "1 Corinthians", chapters: 16, testament: "NT", category: "Pauline Epistles", abbr: "1 Cor" },
  { name: "2 Corinthians", chapters: 13, testament: "NT", category: "Pauline Epistles", abbr: "2 Cor" },
  { name: "Galatians", chapters: 6, testament: "NT", category: "Pauline Epistles", abbr: "Gal" },
  { name: "Ephesians", chapters: 6, testament: "NT", category: "Pauline Epistles", abbr: "Eph" },
  { name: "Philippians", chapters: 4, testament: "NT", category: "Pauline Epistles", abbr: "Phil" },
  { name: "Colossians", chapters: 4, testament: "NT", category: "Pauline Epistles", abbr: "Col" },
  { name: "1 Thessalonians", chapters: 5, testament: "NT", category: "Pauline Epistles", abbr: "1 Thess" },
  { name: "2 Thessalonians", chapters: 3, testament: "NT", category: "Pauline Epistles", abbr: "2 Thess" },
  { name: "1 Timothy", chapters: 6, testament: "NT", category: "Pauline Epistles", abbr: "1 Tim" },
  { name: "2 Timothy", chapters: 4, testament: "NT", category: "Pauline Epistles", abbr: "2 Tim" },
  { name: "Titus", chapters: 3, testament: "NT", category: "Pauline Epistles", abbr: "Titus" },
  { name: "Philemon", chapters: 1, testament: "NT", category: "Pauline Epistles", abbr: "Phlm" },
  { name: "Hebrews", chapters: 13, testament: "NT", category: "General Epistles", abbr: "Heb" },
  { name: "James", chapters: 5, testament: "NT", category: "General Epistles", abbr: "Jas" },
  { name: "1 Peter", chapters: 5, testament: "NT", category: "General Epistles", abbr: "1 Pet" },
  { name: "2 Peter", chapters: 3, testament: "NT", category: "General Epistles", abbr: "2 Pet" },
  { name: "1 John", chapters: 5, testament: "NT", category: "General Epistles", abbr: "1 John" },
  { name: "2 John", chapters: 1, testament: "NT", category: "General Epistles", abbr: "2 John" },
  { name: "3 John", chapters: 1, testament: "NT", category: "General Epistles", abbr: "3 John" },
  { name: "Jude", chapters: 1, testament: "NT", category: "General Epistles", abbr: "Jude" },
  { name: "Revelation", chapters: 22, testament: "NT", category: "Prophecy", abbr: "Rev" },
];

export const BIBLE_TRANSLATIONS = [
  { id: "esv", name: "English Standard Version (ESV — API Key)", short: "ESV" },
  { id: "web", name: "World English Bible (WEB)", short: "WEB" },
  { id: "kjv", name: "King James Version (KJV)", short: "KJV" },
  { id: "asv", name: "American Standard Version (ASV)", short: "ASV" },
  { id: "bbe", name: "Bible in Basic English (BBE)", short: "BBE" },
];

/**
 * Parses a scripture reference string like "Romans 8:28-30" or "1 Cor 13:4" or "Psalm 23"
 * into a canonical { book, chapter, verse } matching BIBLE_BOOKS.
 */
export function parseScriptureReference(ref: string): {
  book: string;
  chapter: number;
  verse?: number;
} | null {
  const cleaned = ref.trim().replace(/\s+/g, " ");
  // Match optional leading number + book name + chapter + optional :verse
  const match = cleaned.match(/^((?:[1-3]\s+)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+))?/i);
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
  return { book: found.name, chapter: clampedChapter, verse };
}
