import { NextResponse } from "next/server";
import { callGemini, resolveApiKey, resolveModel } from "@/lib/gemini";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Please sign in first." },
        { status: 401 }
      );
    }

    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Please enter a Gemini API key first." },
        { status: 400 }
      );
    }

    const reply = await callGemini<string>({
      apiKey,
      model,
      parts: [{ text: "Reply with exactly: OK" }],
      temperature: 0,
      timeoutMs: 10000,
    });

    return NextResponse.json({ ok: true, model, reply: reply.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API key verification failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
