import { NextResponse } from "next/server";
import { callGemini, resolveApiKey, resolveModel } from "@/lib/gemini";
import { createNote } from "@/lib/storage";
import { getSessionUser } from "@/lib/auth";
import { StudyNote } from "@/lib/types";

interface GuidedAIOutput {
  title: string;
  summary: string;
  tags: string[];
  keyThemes: string[];
  outline: { heading: string; points: string[] }[];
  scriptureReferences: { reference: string; context: string }[];
  actionableTakeaways: string[];
  reflectionQuestions: string[];
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before generating a guided study." },
        { status: 401 }
      );
    }

    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    const body = (await request.json()) as {
      mode?: "passage" | "lesson" | "struggle" | "word";
      topic?: string;
      details?: string;
      audience?: string;
      series?: string;
      saveToLibrary?: boolean;
    };

    const mode = body.mode || "passage";
    const topic = body.topic?.trim();
    if (!topic) {
      return NextResponse.json(
        { error: "Please enter a passage, word, or topic to study." },
        { status: 400 }
      );
    }

    const modeDirectives: Record<string, string> = {
      passage: `Build a deep, verse-by-verse Bible study guide on the passage "${topic}". Unpack its historical setting, key Greek/Hebrew words, theological core, and everyday application.`,
      lesson: `Create a complete, ready-to-teach Bible study lesson or sermon outline on "${topic}"${
        body.audience ? ` tailored for: ${body.audience}` : ""
      }. Include an engaging hook, clear main movements with Scripture references, relatable illustrations, and group discussion questions.`,
      struggle: `Create a compassionate, deeply biblical encouragement and study guide for someone walking through: "${topic}". Ground every encouragement in concrete Scripture passages, honest reflection, practical next steps, and prayer.`,
      word: `Create a rich biblical Word Study on "${topic}". Trace its original Hebrew/Greek roots, Strong's meaning, how its usage develops from Old Testament to New Testament, and how it shapes Christian life today.`,
    };

    const prompt = `You are Lamp, a warm, scholarly, and biblically faithful Bible study companion ("Your word is a lamp to my feet" — Psalm 119:105).

Task: ${modeDirectives[mode] || modeDirectives.passage}
${body.details ? `Additional context from user: ${body.details}` : ""}

Return ONLY valid JSON matching this exact schema:
{
  "title": "A compelling, clear title for this study",
  "summary": "A rich 3-4 sentence overview capturing the heart of this study",
  "tags": ["3 to 5 concise topic or Bible book tags"],
  "keyThemes": ["3 to 5 core biblical themes"],
  "outline": [
    {
      "heading": "Section heading",
      "points": ["Clear, insightful bullet points grounded in Scripture"]
    }
  ],
  "scriptureReferences": [
    {
      "reference": "Standard Bible reference e.g. Psalm 119:105 or John 1:1-5",
      "context": "Brief note on how this passage illuminates the study"
    }
  ],
  "actionableTakeaways": ["3 to 5 concrete, practical steps for the week ahead"],
  "reflectionQuestions": ["3 to 4 thoughtful journaling or small-group questions"]
}`;

    const aiData = await callGemini<GuidedAIOutput>({
      apiKey: apiKey || undefined,
      model,
      parts: [{ text: prompt }],
      jsonMode: true,
      temperature: 0.4,
      timeoutMs: 35000,
    });

    const now = new Date().toISOString();
    const note: StudyNote = {
      id: crypto.randomUUID(),
      title: aiData.title || `Study: ${topic}`,
      sourceType: mode === "word" || mode === "passage" ? "verse" : "manual",
      series:
        body.series?.trim() ||
        (mode === "lesson"
          ? "Lessons & Sermons"
          : mode === "struggle"
          ? "Life & Prayer Guides"
          : mode === "word"
          ? "Word Studies"
          : undefined),
      createdAt: now,
      updatedAt: now,
      pinned: false,
      tags: Array.isArray(aiData.tags) ? aiData.tags.slice(0, 6) : [],
      summary: aiData.summary || "",
      keyThemes: Array.isArray(aiData.keyThemes) ? aiData.keyThemes : [],
      outline: Array.isArray(aiData.outline) ? aiData.outline : [],
      scriptureReferences: Array.isArray(aiData.scriptureReferences)
        ? aiData.scriptureReferences
        : [],
      actionableTakeaways: (aiData.actionableTakeaways || []).map((text, i) => ({
        id: `guided-${Date.now()}-${i}`,
        text,
        completed: false,
      })),
      reflectionQuestions: Array.isArray(aiData.reflectionQuestions)
        ? aiData.reflectionQuestions
        : [],
      personalNotes: body.details?.trim() || "",
    };

    if (body.saveToLibrary !== false) {
      const saved = await createNote(note, user.id);
      return NextResponse.json({ note: saved }, { status: 201 });
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate guided study";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
