export type NoteSourceType = "sermon" | "youtube" | "scan" | "verse" | "manual";

export interface OutlineSection {
  heading: string;
  points: string[];
}

export interface ActionTakeaway {
  id: string;
  text: string;
  completed: boolean;
}

export interface ScriptureRef {
  reference: string;
  context?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  sourceType: NoteSourceType;
  series?: string;
  speaker?: string;
  churchOrChannel?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  tags: string[];
  summary: string;
  keyThemes: string[];
  outline: OutlineSection[];
  scriptureReferences: ScriptureRef[];
  actionableTakeaways: ActionTakeaway[];
  reflectionQuestions: string[];
  personalNotes: string;
  transcript?: string;
  durationSeconds?: number;
}

export type HighlightColor = "gold" | "sage" | "sky" | "rose";

export interface VerseHighlight {
  key: string; // e.g. "John:15:5"
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  note?: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VerseInsight {
  reference: string;
  translation: string;
  verseText: string;
  historicalContext: string;
  intendedAudience: string;
  literaryContext: string;
  keyWordStudy: {
    term: string;
    originalLanguage: string;
    meaning: string;
  }[];
  deeperMeaning: string;
  crossReferences: {
    reference: string;
    connection: string;
  }[];
  lifeApplication: string[];
  prayerPrompt: string;
}

export interface BibleVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleChapterResponse {
  reference: string;
  translation_id: string;
  translation_name: string;
  verses: BibleVerse[];
  text: string;
}

export interface BibleBook {
  name: string;
  usfm: string;
  chapters: number;
  testament: "OT" | "NT";
  category: string;
  abbr: string;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  esvApiKey?: string;
  defaultTranslation: string;
  theme: "light" | "dark";
}

export interface ScanResult {
  detectedReference: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  transcribedText: string;
  summary: string;
  historicalContext: string;
  keyThemes: string[];
  actionableTakeaways: string[];
  reflectionQuestions: string[];
}
