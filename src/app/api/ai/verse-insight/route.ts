import { NextResponse } from "next/server";
import { callGemini, resolveApiKey, resolveModel } from "@/lib/gemini";
import { getSessionUser } from "@/lib/auth";
import { buildEffectiveTheologySystemInstruction } from "@/lib/theology";
import {
  fetchGroundedVerseLexicon,
  formatGroundedLexiconForPrompt,
} from "@/lib/lexicon-grounding";
import { VerseInsight } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to load AI verse insights." },
        { status: 401 }
      );
    }

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

    // Ground the AI in real BSB interlinear + Strong's/BDB/Thayer's definitions before generation
    const groundedWords = await fetchGroundedVerseLexicon(body.reference);
    const lexiconBlock = formatGroundedLexiconForPrompt(groundedWords);

    const prompt = `Provide rich, historical-grammatical contextual insight for this Bible verse:

Reference: ${body.reference} (${body.translation || "BSB"})
Verse Text: "${body.verseText}"
${body.surroundingContext ? `Surrounding chapter snippet: "${body.surroundingContext}"` : ""}
${lexiconBlock ? `\n${lexiconBlock}\n` : ""}
Return ONLY valid JSON matching this exact schema:
{
  "historicalContext": "2-3 sentences explaining the historical setting, time period, and cultural backdrop",
  "intendedAudience": "1-2 sentences describing who originally received these words and what they were facing",
  "literaryContext": "1-2 sentences explaining how this verse fits within its chapter, book, and literary genre",
  "keyWordStudy": [
    {
      "term": "Important English word/phrase from the verse",
      "originalLanguage": "Hebrew or Greek word with transliteration, original script, and Strong's # from the verified lexicon data when provided",
      "meaning": "Nuanced lexical meaning grounded in BDB/Thayer's and this verse's context"
    }
  ],
  "deeperMeaning": "3-4 sentences unpacking the core theological truth clearly, warmly, and faithfully in context",
  "crossReferences": [
    {
      "reference": "Related Bible reference e.g. Isaiah 41:10",
      "connection": "One sentence explaining how it echoes or illuminates this verse"
    }
  ],
  "lifeApplication": ["2 to 3 practical, Spirit-empowered ways to live out this verse today"],
  "prayerPrompt": "A short, heartfelt 1-2 sentence prayer inspired by this verse"
}`;

    const ai = await callGemini<Omit<VerseInsight, "reference" | "translation" | "verseText">>({
      apiKey: apiKey || undefined,
      model,
      systemInstruction: await buildEffectiveTheologySystemInstruction("verse"),
      parts: [{ text: prompt }],
      jsonMode: true,
      temperature: 0.3,
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
