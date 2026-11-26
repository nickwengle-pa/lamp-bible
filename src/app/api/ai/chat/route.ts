import { NextResponse } from "next/server";
import { callGemini, resolveApiKey, resolveModel } from "@/lib/gemini";
import { getSessionUser } from "@/lib/auth";
import { buildTheologySystemInstruction } from "@/lib/theology";
import { ChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to ask Lamp AI." },
        { status: 401 }
      );
    }

    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    const body = (await request.json()) as {
      contextType?: "note" | "bible";
      contextTitle?: string;
      contextBody?: string;
      history?: ChatMessage[];
      question?: string;
    };

    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    const historyText = (body.history || [])
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Lamp"}: ${m.content}`)
      .join("\n\n");

    const prompt = `Context Type: ${body.contextType === "bible" ? "Bible Passage" : "Sermon / Study Note"}
Title / Reference: ${body.contextTitle || "Bible Study"}

Study Context:
"""
${(body.contextBody || "").slice(0, 18000)}
"""
${historyText ? `\nRecent Conversation:\n${historyText}\n` : ""}
User's Question:
${question}

Answer clearly, warmly, and faithfully rooted in Scripture. Keep your answer focused, practical, and easy to read (use concise paragraphs or bullet points when helpful). Cite specific Bible verses where relevant.`;

    const answer = await callGemini<string>({
      apiKey: apiKey || undefined,
      model,
      systemInstruction: buildTheologySystemInstruction("chat"),
      parts: [{ text: prompt }],
      temperature: 0.4,
      timeoutMs: 25000,
    });

    return NextResponse.json({ answer: answer.trim() });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not answer question right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
