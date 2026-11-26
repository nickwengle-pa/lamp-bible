import { NextResponse } from "next/server";
import { callGemini, GeminiPart, resolveApiKey, resolveModel } from "@/lib/gemini";
import { createNote } from "@/lib/storage";
import { getSessionUser } from "@/lib/auth";
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

async function uploadAudioToGeminiFiles(
  audioBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string
): Promise<{ fileUri: string; mimeType: string }> {
  const cleanMime = mimeType.split(";")[0] || "audio/webm";
  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": cleanMime,
        "X-Goog-Upload-Protocol": "raw",
      },
      body: audioBytes,
    }
  );

  const json = (await uploadRes.json().catch(() => null)) as {
    file?: { uri?: string; mimeType?: string };
    error?: { message?: string };
  } | null;
  if (!uploadRes.ok || !json?.file?.uri) {
    throw new Error(
      json?.error?.message ||
        `Could not upload sermon audio to Gemini Files API (${uploadRes.status}).`
    );
  }

  return {
    fileUri: json.file.uri as string,
    mimeType: (json.file.mimeType as string) || cleanMime,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing Gemini API key. Open Settings and add your Google AI Studio API key.",
        },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let speaker = "";
    let church = "";
    let series = "";
    let rawNotes = "";
    let liveTranscript = "";
    let durationSeconds: number | undefined;
    let audioPart: GeminiPart | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") || "");
      speaker = String(form.get("speaker") || "");
      church = String(form.get("church") || "");
      series = String(form.get("series") || "");
      rawNotes = String(form.get("rawNotes") || "");
      liveTranscript = String(form.get("liveTranscript") || "");
      const dur = Number(form.get("durationSeconds") || 0);
      if (dur > 0) durationSeconds = dur;

      const audioFile = form.get("audio");
      if (audioFile && audioFile instanceof File && audioFile.size > 0) {
        const bytes = await audioFile.arrayBuffer();
        const mime = (audioFile.type || "audio/webm").split(";")[0];
        // Upload directly to Gemini Files API so 45-90 min sermons work reliably!
        const uploaded = await uploadAudioToGeminiFiles(bytes, mime, apiKey);
        audioPart = {
          fileData: {
            mimeType: uploaded.mimeType,
            fileUri: uploaded.fileUri,
          },
        };
      }
    } else {
      const body = (await request.json()) as {
        title?: string;
        speaker?: string;
        church?: string;
        series?: string;
        rawNotes?: string;
        liveTranscript?: string;
        audioBase64?: string;
        audioMimeType?: string;
        durationSeconds?: number;
      };
      title = body.title || "";
      speaker = body.speaker || "";
      church = body.church || "";
      series = body.series || "";
      rawNotes = body.rawNotes || "";
      liveTranscript = body.liveTranscript || "";
      durationSeconds = body.durationSeconds;

      if (body.audioBase64 && body.audioMimeType) {
        audioPart = {
          inlineData: {
            mimeType: body.audioMimeType.split(";")[0],
            data: body.audioBase64,
          },
        };
      }
    }

    const hasAudio = Boolean(audioPart);
    const hasNotes = rawNotes.trim().length > 0;
    const hasLiveTranscript = liveTranscript.trim().length > 0;

    if (!hasAudio && !hasNotes && !hasLiveTranscript) {
      return NextResponse.json(
        {
          error:
            "Please record/upload audio, capture live captions, or type some sermon notes first.",
        },
        { status: 400 }
      );
    }

    const parts: GeminiPart[] = [];
    if (audioPart) parts.push(audioPart);

    const promptText = `You are Lamp, a thoughtful, warm, and biblically faithful AI Bible study & sermon note assistant.
Analyze the provided sermon inputs (${[
      hasAudio && "sermon audio recording",
      hasLiveTranscript && "live speech transcript",
      hasNotes && "user's personal live notes",
    ]
      .filter(Boolean)
      .join(", ")}).

${title ? `User's tentative title: ${title}` : ""}
${speaker ? `Speaker / Pastor: ${speaker}` : ""}
${church ? `Church / Context: ${church}` : ""}
${series ? `Sermon Series: ${series}` : ""}
${hasLiveTranscript ? `\nLive Captured Transcript:\n"""\n${liveTranscript.slice(0, 50000)}\n"""` : ""}
${hasNotes ? `\nUser's Live Notes:\n"""\n${rawNotes}\n"""` : ""}

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
      : hasLiveTranscript
      ? "A cleaned-up, properly punctuated version of the live transcript"
      : "Empty string since no audio or transcript was provided"
  }"
}`;

    parts.push({ text: promptText });

    const aiData = await callGemini<SermonAIOutput>({
      apiKey,
      model,
      parts,
      jsonMode: true,
      temperature: 0.35,
      timeoutMs: 55000,
    });

    const now = new Date().toISOString();
    const note: StudyNote = {
      id: crypto.randomUUID(),
      title: title.trim() || aiData.title || "Sermon Study Note",
      sourceType: "sermon",
      series: series.trim() || undefined,
      speaker: speaker.trim() || aiData.speaker || undefined,
      churchOrChannel: church.trim() || undefined,
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
      personalNotes: rawNotes.trim() || "",
      transcript: aiData.transcript?.trim() || liveTranscript.trim() || undefined,
      durationSeconds,
    };

    const user = await getSessionUser(request);
    const saved = await createNote(note, user?.id);
    return NextResponse.json({ note: saved }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process sermon notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
