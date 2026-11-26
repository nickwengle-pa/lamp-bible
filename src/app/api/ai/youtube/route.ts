import { NextResponse } from "next/server";
import { callGemini, GeminiPart, resolveApiKey, resolveModel } from "@/lib/gemini";
import { createNote } from "@/lib/storage";
import { StudyNote } from "@/lib/types";

interface YouTubeMeta {
  videoId: string;
  canonicalUrl: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
}

function extractVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (url.searchParams.has("v")) {
      return url.searchParams.get("v");
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "embed" || p === "live" || p === "shorts");
    if (idx !== -1 && parts[idx + 1]) {
      return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeMeta(videoId: string): Promise<YouTubeMeta> {
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const meta: YouTubeMeta = {
    videoId,
    canonicalUrl,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`
    );
    if (oembedRes.ok) {
      const oembed = (await oembedRes.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      meta.title = oembed.title;
      meta.author = oembed.author_name;
      if (oembed.thumbnail_url) meta.thumbnailUrl = oembed.thumbnail_url;
    }
  } catch {
    // Non-fatal
  }

  return meta;
}

async function tryFetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!watchRes.ok) return null;
    const html = await watchRes.text();

    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionMatch) return null;

    const tracks = JSON.parse(captionMatch[1]) as {
      baseUrl: string;
      languageCode?: string;
    }[];
    if (!tracks.length) return null;

    const preferred =
      tracks.find((t) => t.languageCode?.startsWith("en")) || tracks[0];
    if (!preferred?.baseUrl) return null;

    const captionRes = await fetch(preferred.baseUrl);
    if (!captionRes.ok) return null;
    const xml = await captionRes.text();

    const segments = Array.from(xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g))
      .map((m) =>
        m[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean);

    const joined = segments.join(" ");
    return joined.length > 80 ? joined.slice(0, 60000) : null;
  } catch {
    return null;
  }
}

interface YouTubeAIOutput {
  title: string;
  speaker?: string;
  summary: string;
  tags: string[];
  keyThemes: string[];
  outline: { heading: string; points: string[] }[];
  scriptureReferences: { reference: string; context: string }[];
  actionableTakeaways: string[];
  reflectionQuestions: string[];
}

export async function POST(request: Request) {
  try {
    const apiKey = resolveApiKey(request);
    const model = resolveModel(request);

    const body = (await request.json()) as {
      url?: string;
      manualTranscript?: string;
      focusPrompt?: string;
      previewOnly?: boolean;
    };

    if (!body.url?.trim()) {
      return NextResponse.json(
        { error: "Please paste a valid YouTube sermon URL." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(body.url);
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "That doesn't look like a valid YouTube link. Try a youtube.com/watch?v=... or youtu.be/... URL.",
        },
        { status: 400 }
      );
    }

    const meta = await fetchYouTubeMeta(videoId);
    if (body.previewOnly) {
      return NextResponse.json({ meta });
    }

    const transcript =
      body.manualTranscript?.trim() || (await tryFetchYouTubeTranscript(videoId));

    const promptSchema = `Return ONLY valid JSON matching this exact schema:
{
  "title": "A clear, compelling sermon study title",
  "speaker": "Speaker or pastor name if identifiable, else empty string",
  "summary": "A rich 3-4 sentence overview of the sermon's central message and biblical arc",
  "tags": ["3 to 5 concise topic or Bible book tags"],
  "keyThemes": ["3 to 5 core biblical themes from the sermon"],
  "outline": [
    {
      "heading": "Major point or movement of the sermon",
      "points": ["Detailed sub-points, illustrations, and biblical insights"]
    }
  ],
  "scriptureReferences": [
    {
      "reference": "Standard Bible reference e.g. Ephesians 2:8-9",
      "context": "How this verse was explained or applied in the sermon"
    }
  ],
  "actionableTakeaways": ["3 to 5 practical, personalized life-application steps"],
  "reflectionQuestions": ["2 to 4 deep reflection or discussion questions"]
}`;

    const baseInstruction = `You are Vessel, a thoughtful Bible study assistant creating structured sermon study notes from a YouTube sermon.
Video Title: ${meta.title || "Unknown"}
Channel: ${meta.author || "Unknown"}
${body.focusPrompt ? `User's specific focus request: ${body.focusPrompt}` : ""}
${promptSchema}`;

    let aiData: YouTubeAIOutput;

    if (transcript) {
      // Fast, reliable path: use extracted or pasted transcript
      const parts: GeminiPart[] = [
        {
          text: `${baseInstruction}\n\nSermon Transcript:\n"""\n${transcript}\n"""`,
        },
      ];
      aiData = await callGemini<YouTubeAIOutput>({
        apiKey: apiKey || undefined,
        model,
        parts,
        jsonMode: true,
        temperature: 0.35,
      });
    } else {
      // Native Gemini multimodal YouTube URL path!
      const parts: GeminiPart[] = [
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: meta.canonicalUrl,
          },
        },
        {
          text: baseInstruction,
        },
      ];
      aiData = await callGemini<YouTubeAIOutput>({
        apiKey: apiKey || undefined,
        model,
        parts,
        jsonMode: true,
        temperature: 0.35,
      });
    }

    const now = new Date().toISOString();
    const note: StudyNote = {
      id: crypto.randomUUID(),
      title: aiData.title || meta.title || "YouTube Sermon Notes",
      sourceType: "youtube",
      speaker: aiData.speaker || meta.author || undefined,
      churchOrChannel: meta.author || undefined,
      sourceUrl: meta.canonicalUrl,
      thumbnailUrl: meta.thumbnailUrl,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      tags: Array.isArray(aiData.tags) ? aiData.tags.slice(0, 6) : [],
      summary: aiData.summary || "",
      keyThemes: Array.isArray(aiData.keyThemes) ? aiData.keyThemes : [],
      outline: Array.isArray(aiData.outline) ? aiData.outline : [],
      scriptureReferences: Array.isArray(aiData.scriptureReferences)
        ? aiData.scriptureReferences
        : [],
      actionableTakeaways: (aiData.actionableTakeaways || []).map((text, i) => ({
        id: `yt-takeaway-${Date.now()}-${i}`,
        text,
        completed: false,
      })),
      reflectionQuestions: Array.isArray(aiData.reflectionQuestions)
        ? aiData.reflectionQuestions
        : [],
      personalNotes: "",
      transcript: transcript || undefined,
    };

    const saved = await createNote(note);
    return NextResponse.json({ note: saved }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to summarize YouTube sermon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
