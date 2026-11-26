import { env } from "cloudflare:workers";

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
  timeoutMs?: number;
}

export function resolveApiKey(request: Request): string | null {
  const headerKey = request.headers.get("x-gemini-api-key")?.trim();
  if (headerKey) return headerKey;
  const cfEnv = env as unknown as Record<string, string | undefined>;
  const cfKey = cfEnv?.GEMINI_API_KEY?.trim();
  if (cfKey) return cfKey;
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey) return envKey;
  return null;
}

const DEPRECATED_MODELS = new Set([
  "gemini-3.8-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);

export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

export function resolveModel(request: Request): string {
  const headerModel = request.headers.get("x-gemini-model")?.trim();
  if (headerModel && !DEPRECATED_MODELS.has(headerModel)) return headerModel;
  const cfEnv = env as unknown as Record<string, string | undefined>;
  const envModel = cfEnv?.GEMINI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
  if (envModel && !DEPRECATED_MODELS.has(envModel)) return envModel;
  return DEFAULT_GEMINI_MODEL;
}

const FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
];

function isRetryableOverload(status: number, message: string): boolean {
  if (status === 429 || status === 503 || status === 500) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable") ||
    lower.includes("resource exhausted")
  );
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

  const primaryModel = options.model || DEFAULT_GEMINI_MODEL;
  const candidates = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

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

  const serializedBody = JSON.stringify(body);
  const perAttemptTimeout = options.timeoutMs ?? 25000;
  let lastError = "Gemini API request failed.";
  let payload: any = null;

  for (const model of candidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serializedBody,
        signal: AbortSignal.timeout(perAttemptTimeout),
      });

      const json = await response.json().catch(() => null);

      if (response.ok) {
        payload = json;
        break;
      }

      const errMsg =
        json?.error?.message ||
        `Gemini API error (${response.status}): ${response.statusText}`;
      lastError = errMsg;

      if (!isRetryableOverload(response.status, errMsg)) {
        throw new Error(errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout =
        (err instanceof Error && err.name === "TimeoutError") ||
        msg.toLowerCase().includes("aborted") ||
        msg.toLowerCase().includes("timed out");
      if (isTimeout) {
        lastError = `${model} timed out under high demand`;
        continue;
      }
      throw err;
    }
  }

  if (!payload) {
    throw new Error(lastError);
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
