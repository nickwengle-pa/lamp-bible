import { promises as fs } from "fs";
import path from "path";
import { StudyNote } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_FILE = path.join(DATA_DIR, "library.json");

const STARTER_NOTES: StudyNote[] = [
  {
    id: "welcome-sermon-sample",
    title: "Abiding in the Vine: Fruitfulness Over Striving",
    sourceType: "sermon",
    speaker: "Sample Study Note",
    churchOrChannel: "Vessel Starter Library",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
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
        text: "Click any scripture pill above to open it directly in the Vessel Bible Reader with AI verse insights.",
        completed: false,
      },
    ],
    reflectionQuestions: [
      "Where in my life am I trying to manufacture results instead of staying connected to Jesus?",
      "Could a current frustration or limitation actually be a season of gentle pruning?",
    ],
    personalNotes:
      "Tip: You can edit these personal notes anytime, check off takeaways, or delete this sample note once you record your own sermons!",
  },
];

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify(STARTER_NOTES, null, 2), "utf-8");
  }
}

export async function getAllNotes(): Promise<StudyNote[]> {
  await ensureStore();
  const raw = await fs.readFile(NOTES_FILE, "utf-8");
  const notes = JSON.parse(raw) as StudyNote[];
  return notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getNoteById(id: string): Promise<StudyNote | undefined> {
  const notes = await getAllNotes();
  return notes.find((n) => n.id === id);
}

export async function createNote(note: StudyNote): Promise<StudyNote> {
  const notes = await getAllNotes();
  notes.unshift(note);
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2), "utf-8");
  return note;
}

export async function updateNote(
  id: string,
  updates: Partial<StudyNote>
): Promise<StudyNote | null> {
  const notes = await getAllNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = {
    ...notes[idx],
    ...updates,
    id: notes[idx].id,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2), "utf-8");
  return notes[idx];
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await getAllNotes();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;
  await fs.writeFile(NOTES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
