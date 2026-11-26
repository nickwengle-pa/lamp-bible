import { AppSettings, StudyNote } from "./types";

const SETTINGS_KEY = "vessel_app_settings_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  geminiModel: "gemini-3.8-flash",
  esvApiKey: "",
  defaultTranslation: "web",
  theme: "light",
};

const LEGACY_MODELS = new Set([
  "gemini-3.8-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
    if (LEGACY_MODELS.has(parsed.geminiModel)) {
      parsed.geminiModel = DEFAULT_SETTINGS.geminiModel;
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function aiHeaders(settings: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.geminiApiKey.trim()) {
    headers["x-gemini-api-key"] = settings.geminiApiKey.trim();
  }
  if (settings.geminiModel.trim()) {
    headers["x-gemini-model"] = settings.geminiModel.trim();
  }
  return headers;
}

export function bibleHeaders(settings: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {};
  if (settings.esvApiKey?.trim()) {
    headers["x-esv-api-key"] = settings.esvApiKey.trim();
  }
  return headers;
}

export function noteToMarkdown(note: StudyNote): string {
  const lines: string[] = [];
  lines.push(`# ${note.title}`);
  const metaParts = [
    note.speaker && `**Speaker:** ${note.speaker}`,
    note.churchOrChannel && `**Source:** ${note.churchOrChannel}`,
    `**Date:** ${new Date(note.createdAt).toLocaleDateString()}`,
  ].filter(Boolean);
  if (metaParts.length) lines.push(metaParts.join(" · "));
  if (note.sourceUrl) lines.push(`**Link:** ${note.sourceUrl}`);
  if (note.tags.length) lines.push(`**Tags:** ${note.tags.map((t) => `#${t}`).join(" ")}`);
  lines.push("");

  if (note.summary) {
    lines.push("## Summary", note.summary, "");
  }

  if (note.keyThemes.length) {
    lines.push("## Key Themes");
    note.keyThemes.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }

  if (note.scriptureReferences.length) {
    lines.push("## Referenced Scripture");
    note.scriptureReferences.forEach((r) =>
      lines.push(`- **${r.reference}**${r.context ? ` — ${r.context}` : ""}`)
    );
    lines.push("");
  }

  if (note.outline.length) {
    lines.push("## Structured Notes");
    note.outline.forEach((sec) => {
      lines.push(`### ${sec.heading}`);
      sec.points.forEach((p) => lines.push(`- ${p}`));
      lines.push("");
    });
  }

  if (note.actionableTakeaways.length) {
    lines.push("## Actionable Takeaways");
    note.actionableTakeaways.forEach((t) =>
      lines.push(`- [${t.completed ? "x" : " "}] ${t.text}`)
    );
    lines.push("");
  }

  if (note.reflectionQuestions.length) {
    lines.push("## Reflection Questions");
    note.reflectionQuestions.forEach((q) => lines.push(`- ${q}`));
    lines.push("");
  }

  if (note.personalNotes) {
    lines.push("## Personal Reflections", note.personalNotes, "");
  }

  return lines.join("\n");
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
