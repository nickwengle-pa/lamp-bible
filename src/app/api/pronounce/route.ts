import { NextRequest, NextResponse } from "next/server";

const ALLOWED_LANGS: Record<string, string> = {
  el: "el",
  greek: "el",
  he: "iw",
  iw: "iw",
  hebrew: "iw",
  aramaic: "iw",
  en: "en",
  english: "en",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawText = (searchParams.get("text") || "").trim().slice(0, 80);
  const rawLang = (searchParams.get("lang") || "en").trim().toLowerCase();

  if (!rawText) {
    return NextResponse.json({ error: "Missing text parameter." }, { status: 400 });
  }

  const tl = ALLOWED_LANGS[rawLang] || "en";
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
    tl
  )}&q=${encodeURIComponent(rawText)}`;

  try {
    const upstream = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Pronunciation audio unavailable." },
        { status: 502 }
      );
    }

    const audioBuffer = await upstream.arrayBuffer();
    if (!audioBuffer.byteLength) {
      return NextResponse.json(
        { error: "Empty pronunciation audio." },
        { status: 502 }
      );
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pronunciation audio." },
      { status: 502 }
    );
  }
}
