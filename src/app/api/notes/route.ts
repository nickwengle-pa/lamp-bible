import { NextResponse } from "next/server";
import { createNote, getAllNotes } from "@/lib/storage";
import { getSessionUser } from "@/lib/auth";
import { StudyNote } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase().trim() || "";
    const type = searchParams.get("type")?.toLowerCase().trim() || "all";

    let notes = await getAllNotes(user?.id);

    if (type && type !== "all") {
      notes = notes.filter((n) => n.sourceType === type);
    }

    if (q) {
      notes = notes.filter((n) => {
        const haystack = [
          n.title,
          n.speaker,
          n.churchOrChannel,
          n.summary,
          n.personalNotes,
          ...n.tags,
          ...n.keyThemes,
          ...n.scriptureReferences.map((r) => `${r.reference} ${r.context || ""}`),
          ...n.actionableTakeaways.map((t) => t.text),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return NextResponse.json({ notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    const body = (await request.json()) as Partial<StudyNote>;
    const now = new Date().toISOString();

    const newNote: StudyNote = {
      id: body.id || crypto.randomUUID(),
      title: body.title?.trim() || "Untitled Study Note",
      sourceType: body.sourceType || "manual",
      series: body.series?.trim() || undefined,
      speaker: body.speaker?.trim() || undefined,
      churchOrChannel: body.churchOrChannel?.trim() || undefined,
      sourceUrl: body.sourceUrl?.trim() || undefined,
      thumbnailUrl: body.thumbnailUrl?.trim() || undefined,
      createdAt: body.createdAt || now,
      updatedAt: now,
      pinned: Boolean(body.pinned),
      tags: Array.isArray(body.tags) ? body.tags : [],
      summary: body.summary || "",
      keyThemes: Array.isArray(body.keyThemes) ? body.keyThemes : [],
      outline: Array.isArray(body.outline) ? body.outline : [],
      scriptureReferences: Array.isArray(body.scriptureReferences)
        ? body.scriptureReferences
        : [],
      actionableTakeaways: Array.isArray(body.actionableTakeaways)
        ? body.actionableTakeaways
        : [],
      reflectionQuestions: Array.isArray(body.reflectionQuestions)
        ? body.reflectionQuestions
        : [],
      personalNotes: body.personalNotes || "",
      transcript: body.transcript || undefined,
      durationSeconds: body.durationSeconds,
    };

    const created = await createNote(newNote, user?.id);
    return NextResponse.json({ note: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
