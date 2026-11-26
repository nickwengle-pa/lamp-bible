import { NextResponse } from "next/server";
import { callGemini, resolveApiKey, resolveModel } from "@/lib/gemini";
import { getSessionUser } from "@/lib/auth";
import { buildEffectiveTheologySystemInstruction } from "@/lib/theology";
import { ScanResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to scan scripture pages." },
        { status: 401 }
      );
    }

    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    const body = (await request.json()) as {
      imageBase64?: string;
      mimeType?: string;
      focusHint?: string;
    };

    if (!body.imageBase64 || !body.mimeType) {
      return NextResponse.json(
        { error: "Please capture or upload an image of a Bible page first." },
        { status: 400 }
      );
    }

    const prompt = `You are Lamp's Instant Scripture Scanner.
Inspect this photograph of a printed Bible page (or printed scripture passage).
${body.focusHint ? `User hint: ${body.focusHint}` : ""}

1. Identify the exact Bible book, chapter, and verse range visible (or highlighted/centered in the photo).
2. Transcribe the primary visible scripture passage cleanly.
3. Provide concise, warm study notes so the reader immediately understands the passage.

Return ONLY valid JSON matching this exact schema:
{
  "detectedReference": "Canonical reference, e.g. Philippians 4:6-8",
  "book": "Exact standard 66-book Bible book name, e.g. Philippians or Psalms",
  "chapter": 4,
  "verseStart": 6,
  "verseEnd": 8,
  "transcribedText": "Clean transcription of the key passage visible on the page",
  "summary": "2-3 sentence summary of what this passage means",
  "historicalContext": "2 sentences on the historical and literary background",
  "keyThemes": ["2 to 4 core themes"],
  "actionableTakeaways": ["2 to 3 practical life applications"],
  "reflectionQuestions": ["2 thoughtful reflection questions"]
}`;

    const result = await callGemini<ScanResult>({
      apiKey: apiKey || undefined,
      model,
      systemInstruction: await buildEffectiveTheologySystemInstruction("scan"),
      parts: [
        {
          inlineData: {
            mimeType: body.mimeType,
            data: body.imageBase64,
          },
        },
        { text: prompt },
      ],
      jsonMode: true,
      temperature: 0.25,
    });

    return NextResponse.json({ result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to scan Bible page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
