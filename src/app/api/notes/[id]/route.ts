import { NextResponse } from "next/server";
import { deleteNote, getNoteById, updateNote } from "@/lib/storage";
import { StudyNote } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const note = await getNoteById(id);
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
    const { id } = await context.params;
    const updates = (await request.json()) as Partial<StudyNote>;
    const updated = await updateNote(id, updates);
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
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ok = await deleteNote(id);
    if (!ok) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
