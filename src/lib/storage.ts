import { env } from "cloudflare:workers";
import { StudyNote, VerseHighlight } from "./types";

interface VesselKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
  list?(options?: {
    prefix?: string;
    cursor?: string;
  }): Promise<{
    keys: { name: string }[];
    list_complete?: boolean;
    cursor?: string;
  }>;
}

const LEGACY_NOTES_KV_KEY = "vessel_library_notes_v1";
const LEGACY_HIGHLIGHTS_KV_KEY = "vessel_bible_highlights_v1";

function legacyNotesKey(userId?: string): string {
  return userId ? `lamp_user_${userId}_notes_v1` : LEGACY_NOTES_KV_KEY;
}

function legacyHighlightsKey(userId?: string): string {
  return userId ? `lamp_user_${userId}_highlights_v1` : LEGACY_HIGHLIGHTS_KV_KEY;
}

function noteRecordPrefix(userId?: string): string {
  return userId ? `lamp_u_${userId}_note_` : "lamp_legacy_note_";
}

function noteRecordKey(id: string, userId?: string): string {
  return `${noteRecordPrefix(userId)}${id}`;
}

function notesMigratedKey(userId?: string): string {
  return userId ? `lamp_u_${userId}_notes_v2` : "lamp_legacy_notes_v2";
}

function highlightRecordPrefix(userId?: string): string {
  return userId ? `lamp_u_${userId}_hl_` : "lamp_legacy_hl_";
}

function highlightRecordKey(hlKey: string, userId?: string): string {
  return `${highlightRecordPrefix(userId)}${encodeURIComponent(hlKey)}`;
}

function highlightsMigratedKey(userId?: string): string {
  return userId ? `lamp_u_${userId}_hl_v2` : "lamp_legacy_hl_v2";
}

// Per-scope write queue so concurrent updates in the same runtime never clobber one another
const writeQueues = new Map<string, Promise<unknown>>();

function withSerializedWrite<T>(queueKey: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(queueKey) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  writeQueues.set(queueKey, tail);
  return run;
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

async function listAllKeys(kv: VesselKV, prefix: string): Promise<string[]> {
  if (!kv.list) return [];
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await kv.list({ prefix, cursor });
    for (const k of res.keys || []) {
      names.push(k.name);
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return names;
}

/**
 * Copies any existing single-user notes & highlights into the first admin account
 * so zero existing data is lost when multi-user profiles activate.
 */
export async function migrateLegacyDataToUser(userId: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;

  await withSerializedWrite(`notes:${userId}`, async () => {
    const existingUserNotes = await kv.get(legacyNotesKey(userId));
    const alreadyMigrated = await kv.get(notesMigratedKey(userId));
    if (!existingUserNotes && !alreadyMigrated) {
      const legacyNotes = await kv.get(LEGACY_NOTES_KV_KEY);
      if (legacyNotes) {
        if (kv.list) {
          try {
            const parsed = JSON.parse(legacyNotes) as StudyNote[];
            if (Array.isArray(parsed)) {
              await Promise.all(
                parsed.map((n) =>
                  kv.put(noteRecordKey(n.id, userId), JSON.stringify(n))
                )
              );
              await kv.put(notesMigratedKey(userId), "1");
            }
          } catch {
            await kv.put(legacyNotesKey(userId), legacyNotes);
          }
        } else {
          await kv.put(legacyNotesKey(userId), legacyNotes);
        }
      }
    }
  });

  await withSerializedWrite(`hl:${userId}`, async () => {
    const existingUserHl = await kv.get(legacyHighlightsKey(userId));
    const alreadyMigrated = await kv.get(highlightsMigratedKey(userId));
    if (!existingUserHl && !alreadyMigrated) {
      const legacyHl = await kv.get(LEGACY_HIGHLIGHTS_KV_KEY);
      if (legacyHl) {
        if (kv.list) {
          try {
            const parsed = JSON.parse(legacyHl) as Record<string, VerseHighlight>;
            await Promise.all(
              Object.values(parsed).map((h) =>
                kv.put(highlightRecordKey(h.key, userId), JSON.stringify(h))
              )
            );
            await kv.put(highlightsMigratedKey(userId), "1");
          } catch {
            await kv.put(legacyHighlightsKey(userId), legacyHl);
          }
        } else {
          await kv.put(legacyHighlightsKey(userId), legacyHl);
        }
      }
    }
  });
}

async function ensureNotesMigrated(kv: VesselKV, userId?: string): Promise<void> {
  if (!kv.list) return;
  const marker = await kv.get(notesMigratedKey(userId));
  if (marker === "1") return;

  await withSerializedWrite(`notes-migrate:${userId || "legacy"}`, async () => {
    const recheck = await kv.get(notesMigratedKey(userId));
    if (recheck === "1") return;

    const legacyRaw = await kv.get(legacyNotesKey(userId));
    let seed: StudyNote[] = [...STARTER_NOTES];
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw) as StudyNote[];
        if (Array.isArray(parsed)) seed = parsed;
      } catch {
        // fall back to starter notes
      }
    }

    await Promise.all(
      seed.map((n) => kv.put(noteRecordKey(n.id, userId), JSON.stringify(n)))
    );
    await kv.put(notesMigratedKey(userId), "1");
  });
}

async function readNotes(userId?: string): Promise<StudyNote[]> {
  const kv = getKv();
  if (kv) {
    if (kv.list) {
      await ensureNotesMigrated(kv, userId);
      const keys = await listAllKeys(kv, noteRecordPrefix(userId));
      if (keys.length === 0) return [];
      const values = await Promise.all(keys.map((k) => kv.get(k)));
      const notes: StudyNote[] = [];
      for (const raw of values) {
        if (!raw) continue;
        try {
          notes.push(JSON.parse(raw) as StudyNote);
        } catch {
          // skip malformed
        }
      }
      return notes;
    }

    const key = legacyNotesKey(userId);
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

  const key = legacyNotesKey(userId);
  if (!memoryNotesByKey.has(key)) {
    memoryNotesByKey.set(key, [...STARTER_NOTES]);
  }
  return [...(memoryNotesByKey.get(key) || STARTER_NOTES)];
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
  const kv = getKv();
  if (kv && kv.list) {
    await ensureNotesMigrated(kv, userId);
    const raw = await kv.get(noteRecordKey(id, userId));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as StudyNote;
    } catch {
      return undefined;
    }
  }
  const notes = await readNotes(userId);
  return notes.find((n) => n.id === id);
}

export async function createNote(
  note: StudyNote,
  userId?: string
): Promise<StudyNote> {
  const kv = getKv();
  if (kv && kv.list) {
    await ensureNotesMigrated(kv, userId);
    // Independent key per note: concurrent creations never overwrite one another
    await kv.put(noteRecordKey(note.id, userId), JSON.stringify(note));
    return note;
  }

  return withSerializedWrite(`notes:${userId || "legacy"}`, async () => {
    const notes = await readNotes(userId);
    const filtered = notes.filter((n) => n.id !== note.id);
    filtered.unshift(note);
    const key = legacyNotesKey(userId);
    if (kv) {
      await kv.put(key, JSON.stringify(filtered));
    } else {
      memoryNotesByKey.set(key, filtered);
    }
    return note;
  });
}

export async function updateNote(
  id: string,
  updates: Partial<StudyNote>,
  userId?: string
): Promise<StudyNote | null> {
  const kv = getKv();
  if (kv && kv.list) {
    return withSerializedWrite(`note:${userId || "legacy"}:${id}`, async () => {
      await ensureNotesMigrated(kv, userId);
      const raw = await kv.get(noteRecordKey(id, userId));
      if (!raw) return null;
      const existing = JSON.parse(raw) as StudyNote;
      const updated: StudyNote = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };
      await kv.put(noteRecordKey(id, userId), JSON.stringify(updated));
      return updated;
    });
  }

  return withSerializedWrite(`notes:${userId || "legacy"}`, async () => {
    const notes = await readNotes(userId);
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notes[idx] = {
      ...notes[idx],
      ...updates,
      id: notes[idx].id,
      updatedAt: new Date().toISOString(),
    };
    const key = legacyNotesKey(userId);
    if (kv) {
      await kv.put(key, JSON.stringify(notes));
    } else {
      memoryNotesByKey.set(key, notes);
    }
    return notes[idx];
  });
}

export async function deleteNote(
  id: string,
  userId?: string
): Promise<boolean> {
  const kv = getKv();
  if (kv && kv.list) {
    return withSerializedWrite(`note:${userId || "legacy"}:${id}`, async () => {
      await ensureNotesMigrated(kv, userId);
      const k = noteRecordKey(id, userId);
      const existing = await kv.get(k);
      if (!existing) return false;
      if (kv.delete) {
        await kv.delete(k);
      } else {
        await kv.put(k, "");
      }
      return true;
    });
  }

  return withSerializedWrite(`notes:${userId || "legacy"}`, async () => {
    const notes = await readNotes(userId);
    const filtered = notes.filter((n) => n.id !== id);
    if (filtered.length === notes.length) return false;
    const key = legacyNotesKey(userId);
    if (kv) {
      await kv.put(key, JSON.stringify(filtered));
    } else {
      memoryNotesByKey.set(key, filtered);
    }
    return true;
  });
}

// --- Bible Highlights & Margin Notes (per user, independent record keys) ---
async function ensureHighlightsMigrated(kv: VesselKV, userId?: string): Promise<void> {
  if (!kv.list) return;
  const marker = await kv.get(highlightsMigratedKey(userId));
  if (marker === "1") return;

  await withSerializedWrite(`hl-migrate:${userId || "legacy"}`, async () => {
    const recheck = await kv.get(highlightsMigratedKey(userId));
    if (recheck === "1") return;

    const legacyRaw = await kv.get(legacyHighlightsKey(userId));
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw) as Record<string, VerseHighlight>;
        await Promise.all(
          Object.values(parsed).map((h) =>
            kv.put(highlightRecordKey(h.key, userId), JSON.stringify(h))
          )
        );
      } catch {
        // ignore corrupt legacy blob
      }
    }
    await kv.put(highlightsMigratedKey(userId), "1");
  });
}

export async function getAllHighlights(
  userId?: string
): Promise<Record<string, VerseHighlight>> {
  const kv = getKv();
  if (kv) {
    if (kv.list) {
      await ensureHighlightsMigrated(kv, userId);
      const keys = await listAllKeys(kv, highlightRecordPrefix(userId));
      const out: Record<string, VerseHighlight> = {};
      if (keys.length === 0) return out;
      const values = await Promise.all(keys.map((k) => kv.get(k)));
      for (const raw of values) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as VerseHighlight;
          if (parsed?.key) out[parsed.key] = parsed;
        } catch {
          // skip malformed
        }
      }
      return out;
    }

    const key = legacyHighlightsKey(userId);
    const raw = await kv.get(key);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, VerseHighlight>;
    } catch {
      return {};
    }
  }
  return { ...(memoryHighlightsByKey.get(legacyHighlightsKey(userId)) || {}) };
}

export async function upsertHighlight(
  highlight: VerseHighlight,
  userId?: string
): Promise<Record<string, VerseHighlight>> {
  const kv = getKv();
  if (kv && kv.list) {
    await ensureHighlightsMigrated(kv, userId);
    await kv.put(highlightRecordKey(highlight.key, userId), JSON.stringify(highlight));
    return getAllHighlights(userId);
  }

  return withSerializedWrite(`hl:${userId || "legacy"}`, async () => {
    const key = legacyHighlightsKey(userId);
    const all = await getAllHighlights(userId);
    all[highlight.key] = highlight;
    if (kv) {
      await kv.put(key, JSON.stringify(all));
    } else {
      memoryHighlightsByKey.set(key, all);
    }
    return all;
  });
}

export async function deleteHighlight(
  highlightKey: string,
  userId?: string
): Promise<Record<string, VerseHighlight>> {
  const kv = getKv();
  if (kv && kv.list) {
    await ensureHighlightsMigrated(kv, userId);
    const k = highlightRecordKey(highlightKey, userId);
    if (kv.delete) {
      await kv.delete(k);
    } else {
      await kv.put(k, "");
    }
    return getAllHighlights(userId);
  }

  return withSerializedWrite(`hl:${userId || "legacy"}`, async () => {
    const key = legacyHighlightsKey(userId);
    const all = await getAllHighlights(userId);
    delete all[highlightKey];
    if (kv) {
      await kv.put(key, JSON.stringify(all));
    } else {
      memoryHighlightsByKey.set(key, all);
    }
    return all;
  });
}
