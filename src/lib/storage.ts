import { env } from "cloudflare:workers";
import { StudyNote, VerseHighlight } from "./types";

interface VesselKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
}

const LEGACY_NOTES_KV_KEY = "vessel_library_notes_v1";
const LEGACY_HIGHLIGHTS_KV_KEY = "vessel_bible_highlights_v1";
const PIN_KV_KEY = "vessel_privacy_pin_hash_v1";

function notesKey(userId?: string): string {
  return userId ? `lamp_user_${userId}_notes_v1` : LEGACY_NOTES_KV_KEY;
}

function highlightsKey(userId?: string): string {
  return userId ? `lamp_user_${userId}_highlights_v1` : LEGACY_HIGHLIGHTS_KV_KEY;
}

const STARTER_NOTES: StudyNote[] = [
  {
    id: "welcome-sermon-sample",
    title: "Abiding in the Vine: Fruitfulness Over Striving",
    sourceType: "sermon",
    speaker: "Sample Study Note",
    churchOrChannel: "Lamp Starter Library",
    createdAt: "2026-11-24T15:00:00.000Z",
    updatedAt: "2026-11-24T15:00:00.000Z",
    pinned: true,
    tags: ["John 15", "Spiritual Growth", "Grace"],
    summary:
      "True spiritual fruit is never manufactured through anxious self-effort; it flows naturally from remaining rooted in Christ. Jesus contrasts frantic religious performance with unhurried, daily dependence on Him as the True Vine.",
    keyThemes: [
      "Connection before production",
      "Pruning as an act of the Father's care, not punishment",
      "Joy as the natural byproduct of abiding",
    ],
    outline: [
      {
        heading: "1. The Illusion of Self-Made Fruit (John 15:1–4)",
        points: [
          "A branch disconnected from the vine can look alive for a while, yet produces nothing lasting.",
          "Abiding ('meno' in Greek) means to dwell, stay, and make your home in Christ's love.",
        ],
      },
      {
        heading: "2. Understanding God's Pruning (John 15:2)",
        points: [
          "The vinedresser trims even healthy branches—not out of anger, but so energy goes toward deeper fruit.",
          "Seasons of stripping away distractions often prepare us for greater clarity and love.",
        ],
      },
      {
        heading: "3. Practicing Daily Abiding (John 15:7–11)",
        points: [
          "Letting Scripture dwell richly in your mind reshapes your prayers and desires.",
          "Obedience is the doorway into experiencing Jesus' own joy.",
        ],
      },
    ],
    scriptureReferences: [
      { reference: "John 15:1-11", context: "Primary passage on the True Vine and branches" },
      { reference: "Psalm 1:1-3", context: "The tree planted by streams of living water" },
      { reference: "Galatians 5:22-23", context: "The fruit produced by the Spirit" },
    ],
    actionableTakeaways: [
      {
        id: "t1",
        text: "Set aside 10 unhurried minutes tomorrow morning to read John 15:1-11 slowly before checking notifications.",
        completed: false,
      },
      {
        id: "t2",
        text: "Identify one area of anxious striving this week and intentionally surrender it in prayer.",
        completed: false,
      },
      {
        id: "t3",
        text: "Click any scripture pill above to open it directly in the Lamp Bible Reader with AI verse insights.",
        completed: false,
      },
    ],
    reflectionQuestions: [
      "Where in my life am I trying to manufacture results instead of staying connected to Jesus?",
      "Could a current frustration or limitation actually be a season of gentle pruning?",
    ],
    personalNotes:
      "Tip: Your notes sync privately to your profile across all your devices! You can edit these reflections, check off takeaways, or delete this sample note anytime.",
  },
];

// Fallback in-memory maps only if KV binding is unavailable
const memoryNotesByKey = new Map<string, StudyNote[]>();
const memoryHighlightsByKey = new Map<string, Record<string, VerseHighlight>>();

function getKv(): VesselKV | null {
  const cfEnv = env as unknown as { VESSEL_NOTES?: VesselKV };
  return cfEnv?.VESSEL_NOTES ?? null;
}

/**
 * Copies any existing single-user notes & highlights into the first admin account
 * so zero existing data is lost when multi-user profiles activate.
 */
export async function migrateLegacyDataToUser(userId: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;

  const existingUserNotes = await kv.get(notesKey(userId));
  if (!existingUserNotes) {
    const legacyNotes = await kv.get(LEGACY_NOTES_KV_KEY);
    if (legacyNotes) {
      await kv.put(notesKey(userId), legacyNotes);
    }
  }

  const existingUserHl = await kv.get(highlightsKey(userId));
  if (!existingUserHl) {
    const legacyHl = await kv.get(LEGACY_HIGHLIGHTS_KV_KEY);
    if (legacyHl) {
      await kv.put(highlightsKey(userId), legacyHl);
    }
  }
}

async function readNotes(userId?: string): Promise<StudyNote[]> {
  const key = notesKey(userId);
  const kv = getKv();
  if (kv) {
    const raw = await kv.get(key);
    if (!raw) {
      await kv.put(key, JSON.stringify(STARTER_NOTES));
      return [...STARTER_NOTES];
    }
    try {
      return JSON.parse(raw) as StudyNote[];
    } catch {
      return [...STARTER_NOTES];
    }
  }

  if (!memoryNotesByKey.has(key)) {
    memoryNotesByKey.set(key, [...STARTER_NOTES]);
  }
  return [...(memoryNotesByKey.get(key) || STARTER_NOTES)];
}

async function writeNotes(notes: StudyNote[], userId?: string): Promise<void> {
  const key = notesKey(userId);
  const kv = getKv();
  if (kv) {
    await kv.put(key, JSON.stringify(notes));
    return;
  }
  memoryNotesByKey.set(key, [...notes]);
}

export async function getAllNotes(userId?: string): Promise<StudyNote[]> {
  const notes = await readNotes(userId);
  return notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getNoteById(
  id: string,
  userId?: string
): Promise<StudyNote | undefined> {
  const notes = await readNotes(userId);
  return notes.find((n) => n.id === id);
}

export async function createNote(
  note: StudyNote,
  userId?: string
): Promise<StudyNote> {
  const notes = await readNotes(userId);
  notes.unshift(note);
  await writeNotes(notes, userId);
  return note;
}

export async function updateNote(
  id: string,
  updates: Partial<StudyNote>,
  userId?: string
): Promise<StudyNote | null> {
  const notes = await readNotes(userId);
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = {
    ...notes[idx],
    ...updates,
    id: notes[idx].id,
    updatedAt: new Date().toISOString(),
  };
  await writeNotes(notes, userId);
  return notes[idx];
}

export async function deleteNote(
  id: string,
  userId?: string
): Promise<boolean> {
  const notes = await readNotes(userId);
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;
  await writeNotes(filtered, userId);
  return true;
}

// --- Bible Highlights & Margin Notes (per user) ---
export async function getAllHighlights(
  userId?: string
): Promise<Record<string, VerseHighlight>> {
  const key = highlightsKey(userId);
  const kv = getKv();
  if (kv) {
    const raw = await kv.get(key);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, VerseHighlight>;
    } catch {
      return {};
    }
  }
  return { ...(memoryHighlightsByKey.get(key) || {}) };
}

export async function upsertHighlight(
  highlight: VerseHighlight,
  userId?: string
): Promise<Record<string, VerseHighlight>> {
  const key = highlightsKey(userId);
  const all = await getAllHighlights(userId);
  all[highlight.key] = highlight;
  const kv = getKv();
  if (kv) {
    await kv.put(key, JSON.stringify(all));
  } else {
    memoryHighlightsByKey.set(key, all);
  }
  return all;
}

export async function deleteHighlight(
  highlightKey: string,
  userId?: string
): Promise<Record<string, VerseHighlight>> {
  const key = highlightsKey(userId);
  const all = await getAllHighlights(userId);
  delete all[highlightKey];
  const kv = getKv();
  if (kv) {
    await kv.put(key, JSON.stringify(all));
  } else {
    memoryHighlightsByKey.set(key, all);
  }
  return all;
}

// --- Optional Legacy Privacy PIN Lock ---
let memoryPinHash: string | null = null;

export async function getPinHash(): Promise<string | null> {
  const kv = getKv();
  if (kv) {
    const raw = await kv.get(PIN_KV_KEY);
    return raw || null;
  }
  return memoryPinHash;
}

export async function setPinHash(hash: string | null): Promise<void> {
  const kv = getKv();
  if (kv) {
    if (!hash) {
      if (kv.delete) {
        await kv.delete(PIN_KV_KEY);
      } else {
        await kv.put(PIN_KV_KEY, "");
      }
    } else {
      await kv.put(PIN_KV_KEY, hash);
    }
    return;
  }
  memoryPinHash = hash;
}
