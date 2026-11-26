import { NextResponse } from "next/server";
import { callGemini, resolveApiKey, resolveModel } from "@/lib/gemini";
import { VerseInsight } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    const body = (await request.json()) as {
      reference?: string;
      verseText?: string;
      translation?: string;
      surroundingContext?: string;
    };

    if (!body.reference || !body.verseText) {
      return NextResponse.json(
        { error: "Verse reference and text are required." },
        { status: 400 }
      );
    }

    const prompt = `You are Vessel, a scholarly yet deeply accessible Bible study guide.
Provide rich contextual insight for this Bible verse:

Reference: ${body.reference} (${body.translation || "WEB"})
Verse Text: "${body.verseText}"
${body.surroundingContext ? `Surrounding chapter snippet: "${body.surroundingContext}"` : ""}

Return ONLY valid JSON matching this exact schema:
{
  "historicalContext": "2-3 sentences explaining the historical setting, time period, and cultural backdrop",
  "intendedAudience": "1-2 sentences describing who originally received these words and what they were facing",
  "literaryContext": "1-2 sentences explaining how this verse fits within its chapter and book",
  "keyWordStudy": [
    {
      "term": "Important English word/phrase from the verse",
      "originalLanguage": "Hebrew or Greek word (transliterated + original script)",
      "meaning": "Nuanced meaning and why it deepens understanding"
    }
  ],
  "deeperMeaning": "3-4 sentences unpacking the core theological truth clearly and warmly",
  "crossReferences": [
    {
      "reference": "Related Bible reference e.g. Isaiah 41:10",
      "connection": "One sentence explaining how it echoes or illuminates this verse"
    }
  ],
  "lifeApplication": ["2 to 3 practical, grounded ways to live out this verse today"],
  "prayerPrompt": "A short, heartfelt 1-2 sentence prayer inspired by this verse"
}`;

    const ai = await callGemini<Omit<VerseInsight, "reference" | "translation" | "verseText">>({
      apiKey: apiKey || undefined,
      model,
      parts: [{ text: prompt }],
      jsonMode: true,
      temperature: 0.35,
    });

    const insight: VerseInsight = {
      reference: body.reference,
      translation: body.translation || "WEB",
      verseText: body.verseText,
      historicalContext: ai.historicalContext || "",
      intendedAudience: ai.intendedAudience || "",
      literaryContext: ai.literaryContext || "",
      keyWordStudy: Array.isArray(ai.keyWordStudy) ? ai.keyWordStudy : [],
      deeperMeaning: ai.deeperMeaning || "",
      crossReferences: Array.isArray(ai.crossReferences) ? ai.crossReferences : [],
      lifeApplication: Array.isArray(ai.lifeApplication) ? ai.lifeApplication : [],
      prayerPrompt: ai.prayerPrompt || "",
    };

    return NextResponse.json({ insight });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate verse insight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
