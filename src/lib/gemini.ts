export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    mimeType?: string;
    fileUri: string;
  };
}

export interface GeminiRequestOptions {
  apiKey?: string;
  model?: string;
  systemInstruction?: string;
  parts: GeminiPart[];
  jsonMode?: boolean;
  temperature?: number;
}

export function resolveApiKey(request: Request): string | null {
  const headerKey = request.headers.get("x-gemini-api-key")?.trim();
  if (headerKey) return headerKey;
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey) return envKey;
  return null;
}

export function resolveModel(request: Request): string {
  const headerModel = request.headers.get("x-gemini-model")?.trim();
  if (headerModel) return headerModel;
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export async function callGemini<T = string>(
  options: GeminiRequestOptions
): Promise<T> {
  const apiKey = options.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Open Settings (top right) and add your free Google AI Studio API key."
    );
  }

  const model = options.model || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: options.parts,
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errMsg =
      payload?.error?.message ||
      `Gemini API error (${response.status}): ${response.statusText}`;
    throw new Error(errMsg);
  }

  const text: string | undefined =
    payload?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") || undefined;

  if (!text) {
    const blockReason = payload?.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini blocked the response (${blockReason}).`
        : "Gemini returned an empty response. Please try again."
    );
  }

  if (!options.jsonMode) {
    return text as unknown as T;
  }

  // Strip optional markdown code fences if present
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      "Gemini returned malformed JSON. Try running the request again."
    );
  }
}
