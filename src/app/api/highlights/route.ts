import { NextResponse } from "next/server";
import {
  deleteHighlight,
  getAllHighlights,
  upsertHighlight,
} from "@/lib/storage";
import { getSessionUser } from "@/lib/auth";
import { HighlightColor, VerseHighlight } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    const highlights = await getAllHighlights(user?.id);
    return NextResponse.json({ highlights });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load highlights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request);
    const body = (await request.json()) as {
      book?: string;
      chapter?: number;
      verse?: number;
      color?: HighlightColor;
      note?: string;
    };

    if (!body.book || !body.chapter || !body.verse || !body.color) {
      return NextResponse.json(
        { error: "book, chapter, verse, and color are required." },
        { status: 400 }
      );
    }

    const key = `${body.book}:${body.chapter}:${body.verse}`;
    const entry: VerseHighlight = {
      key,
      book: body.book,
      chapter: body.chapter,
      verse: body.verse,
      color: body.color,
      note: body.note?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const highlights = await upsertHighlight(entry, user?.id);
    return NextResponse.json({ highlights, highlight: entry });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save highlight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key")?.trim();
    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }
    const highlights = await deleteHighlight(key, user?.id);
    return NextResponse.json({ highlights });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete highlight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
