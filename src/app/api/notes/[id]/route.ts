import { NextResponse } from "next/server";
import { deleteNote, getNoteById, updateNote } from "@/lib/storage";
import { getSessionUser } from "@/lib/auth";
import { StudyNote } from "@/lib/types";
import { richHtmlToPlainText, sanitizeRichNoteHtml } from "@/lib/rich-text";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    const { id } = await context.params;
    const note = await getNoteById(id, user.id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ note });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    const { id } = await context.params;
    const rawUpdates = (await request.json()) as Partial<StudyNote>;
    const updates: Partial<StudyNote> = { ...rawUpdates };
    if (rawUpdates.personalNotesHtml !== undefined) {
      const safeHtml = rawUpdates.personalNotesHtml
        ? sanitizeRichNoteHtml(rawUpdates.personalNotesHtml, 50000)
        : "";
      updates.personalNotesHtml = safeHtml || undefined;
      if (rawUpdates.personalNotes === undefined) {
        updates.personalNotes = safeHtml ? richHtmlToPlainText(safeHtml) : "";
      }
    }
    const updated = await updateNote(id, updates, user.id);
    if (!updated) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ note: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    const { id } = await context.params;
    const ok = await deleteNote(id, user.id);
    if (!ok) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
