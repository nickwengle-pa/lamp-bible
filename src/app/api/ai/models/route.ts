import { NextResponse } from "next/server";
import { DEFAULT_GEMINI_MODEL, resolveApiKey } from "@/lib/gemini";

interface RawGeminiModel {
  name?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

export async function GET(request: Request) {
  try {
    const apiKey = resolveApiKey(request);
    if (!apiKey) {
      return NextResponse.json({
        models: [
          {
            id: DEFAULT_GEMINI_MODEL,
            label: "Gemini 3.8 Flash (Recommended)",
          },
        ],
      });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(
        apiKey
      )}`
    );

    if (!res.ok) {
      return NextResponse.json({
        models: [
          {
            id: DEFAULT_GEMINI_MODEL,
            label: "Gemini 3.8 Flash (Recommended)",
          },
        ],
      });
    }

    const data = (await res.json()) as { models?: RawGeminiModel[] };
    const filtered = (data.models || [])
      .filter((m) => {
        const id = (m.name || "").replace(/^models\//, "");
        const methods = m.supportedGenerationMethods || [];
        return (
          id.startsWith("gemini-") &&
          !id.includes("embedding") &&
          !id.includes("tts") &&
          !id.includes("imagen") &&
          !id.includes("veo") &&
          methods.includes("generateContent")
        );
      })
      .map((m) => {
        const id = (m.name || "").replace(/^models\//, "");
        const display = m.displayName || id;
        return {
          id,
          label:
            id === DEFAULT_GEMINI_MODEL
              ? `${display} (${id}) — Recommended`
              : `${display} (${id})`,
        };
      });

    // Put default model at the top if present
    filtered.sort((a, b) => {
      if (a.id === DEFAULT_GEMINI_MODEL) return -1;
      if (b.id === DEFAULT_GEMINI_MODEL) return 1;
      return b.id.localeCompare(a.id);
    });

    if (filtered.length === 0) {
      filtered.push({
        id: DEFAULT_GEMINI_MODEL,
        label: "Gemini 3.8 Flash (Recommended)",
      });
    }

    return NextResponse.json({ models: filtered });
  } catch {
    return NextResponse.json({
      models: [
        {
          id: DEFAULT_GEMINI_MODEL,
          label: "Gemini 3.8 Flash (Recommended)",
        },
      ],
    });
  }
}
