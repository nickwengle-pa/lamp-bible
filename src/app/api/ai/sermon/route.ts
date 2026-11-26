import { NextResponse } from "next/server";
import { callGemini, GeminiPart, resolveApiKey, resolveModel } from "@/lib/gemini";
import { createNote } from "@/lib/storage";
import { StudyNote } from "@/lib/types";

interface SermonAIOutput {
  title: string;
  speaker?: string;
  summary: string;
  tags: string[];
  keyThemes: string[];
  outline: { heading: string; points: string[] }[];
  scriptureReferences: { reference: string; context: string }[];
  actionableTakeaways: string[];
  reflectionQuestions: string[];
  transcript?: string;
}

export async function POST(request: Request) {
  try {
    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    const body = (await request.json()) as {
      title?: string;
      speaker?: string;
      church?: string;
      rawNotes?: string;
      audioBase64?: string;
      audioMimeType?: string;
      durationSeconds?: number;
    };

    const hasAudio = Boolean(body.audioBase64 && body.audioMimeType);
    const hasNotes = Boolean(body.rawNotes && body.rawNotes.trim().length > 0);

    if (!hasAudio && !hasNotes) {
      return NextResponse.json(
        { error: "Please record/upload audio or type some sermon notes first." },
        { status: 400 }
      );
    }

    const parts: GeminiPart[] = [];

    if (hasAudio && body.audioBase64 && body.audioMimeType) {
      parts.push({
        inlineData: {
          mimeType: body.audioMimeType,
          data: body.audioBase64,
        },
      });
    }

    const promptText = `You are Vessel, a thoughtful, warm, and biblically faithful AI Bible study & sermon note assistant.
Analyze the provided ${hasAudio ? "sermon audio recording" : ""}${
      hasAudio && hasNotes ? " AND " : ""
    }${hasNotes ? "user's live rough notes" : ""}.

${body.title ? `User's tentative title: ${body.title}` : ""}
${body.speaker ? `Speaker / Pastor: ${body.speaker}` : ""}
${body.church ? `Church / Context: ${body.church}` : ""}
${hasNotes ? `\nUser's Live Notes:\n"""\n${body.rawNotes}\n"""` : ""}

Return ONLY valid JSON matching this exact schema:
{
  "title": "A clear, compelling title for this sermon or study",
  "speaker": "Speaker name if known or mentioned, else empty string",
  "summary": "A rich 2-4 sentence executive summary capturing the core biblical message",
  "tags": ["3 to 5 concise topic or Bible book tags"],
  "keyThemes": ["3 to 5 overarching theological or spiritual themes"],
  "outline": [
    {
      "heading": "Main section heading (include verse range if applicable)",
      "points": ["Clear, memorable bullet points from the teaching"]
    }
  ],
  "scriptureReferences": [
    {
      "reference": "Standard Bible reference e.g. Romans 8:28 or John 15:1-5",
      "context": "Brief note on how the speaker used this passage"
    }
  ],
  "actionableTakeaways": ["3 to 5 concrete, practical life applications for the week ahead"],
  "reflectionQuestions": ["2 to 4 thoughtful journaling or small-group reflection questions"],
  "transcript": "${
    hasAudio
      ? "A clean, readable transcript of the audio recording"
      : "Empty string since no audio was provided"
  }"
}`;

    parts.push({ text: promptText });

    const aiData = await callGemini<SermonAIOutput>({
      apiKey: apiKey || undefined,
      model,
      parts,
      jsonMode: true,
      temperature: 0.35,
    });

    const now = new Date().toISOString();
    const note: StudyNote = {
      id: crypto.randomUUID(),
      title: body.title?.trim() || aiData.title || "Sermon Study Note",
      sourceType: "sermon",
      speaker: body.speaker?.trim() || aiData.speaker || undefined,
      churchOrChannel: body.church?.trim() || undefined,
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
        id: `takeaway-${Date.now()}-${i}`,
        text,
        completed: false,
      })),
      reflectionQuestions: Array.isArray(aiData.reflectionQuestions)
        ? aiData.reflectionQuestions
        : [],
      personalNotes: body.rawNotes?.trim() || "",
      transcript: aiData.transcript?.trim() || undefined,
      durationSeconds: body.durationSeconds,
    };

    const saved = await createNote(note);
    return NextResponse.json({ note: saved }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process sermon notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
