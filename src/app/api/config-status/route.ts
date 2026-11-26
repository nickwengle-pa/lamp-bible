import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export async function GET() {
  const cfEnv = env as unknown as Record<string, string | undefined>;
  const hasServerGeminiKey = Boolean(
    cfEnv?.GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
  );
  const hasServerEsvKey = Boolean(
    cfEnv?.ESV_API_KEY?.trim() || process.env.ESV_API_KEY?.trim()
  );
  const hasServerApiBibleKey = Boolean(
    cfEnv?.API_BIBLE_KEY?.trim() || process.env.API_BIBLE_KEY?.trim()
  );
  return NextResponse.json({
    hasServerGeminiKey,
    hasServerEsvKey,
    hasServerApiBibleKey,
  });
}
