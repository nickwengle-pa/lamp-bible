import { AppSettings, StudyNote } from "./types";

const LEGACY_SETTINGS_KEY = "vessel_app_settings_v1";
const THEME_KEY = "lamp_theme_v1";

function scopedSettingsKey(userId: string): string {
  return `lamp_settings_v2_${userId}`;
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  geminiModel: "",
  esvApiKey: "",
  defaultTranslation: "",
  theme: "light",
};

const LEGACY_MODELS = new Set([
  "gemini-3.8-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);

export function loadThemePreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    const legacy = window.localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { theme?: string };
      if (parsed.theme === "dark") return "dark";
    }
  } catch {
    // ignore
  }
  return "light";
}

/**
 * Loads settings scoped to the signed-in account so personal API keys and
 * preferences never leak across accounts sharing the same browser.
 */
export function loadSettings(
  userId?: string,
  userRole?: "admin" | "member"
): AppSettings {
  const base: AppSettings = {
    ...DEFAULT_SETTINGS,
    theme: loadThemePreference(),
  };
  if (typeof window === "undefined" || !userId) return base;

  try {
    const scopedRaw = window.localStorage.getItem(scopedSettingsKey(userId));
    if (scopedRaw) {
      const parsed = { ...base, ...JSON.parse(scopedRaw) } as AppSettings;
      if (LEGACY_MODELS.has(parsed.geminiModel)) {
        parsed.geminiModel = "";
      }
      if (userRole !== "admin") {
        parsed.geminiApiKey = "";
        parsed.esvApiKey = "";
        parsed.geminiModel = "";
      }
      return parsed;
    }

    // One-time migration of legacy unscoped browser settings ONLY for the owner account
    if (userRole === "admin") {
      const legacyRaw = window.localStorage.getItem(LEGACY_SETTINGS_KEY);
      if (legacyRaw) {
        const parsed = { ...base, ...JSON.parse(legacyRaw) } as AppSettings;
        if (
          LEGACY_MODELS.has(parsed.geminiModel) ||
          parsed.geminiModel === "gemini-flash-lite-latest"
        ) {
          parsed.geminiModel = "";
        }
        window.localStorage.setItem(
          scopedSettingsKey(userId),
          JSON.stringify(parsed)
        );
        // Remove unscoped legacy record so other accounts on this browser never inherit keys
        window.localStorage.removeItem(LEGACY_SETTINGS_KEY);
        return parsed;
      }
    }

    return base;
  } catch {
    return base;
  }
}

export function saveSettings(settings: AppSettings, userId?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, settings.theme);
  if (!userId) return;
  window.localStorage.setItem(scopedSettingsKey(userId), JSON.stringify(settings));
}

export function aiHeaders(settings: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.geminiApiKey.trim()) {
    headers["x-gemini-api-key"] = settings.geminiApiKey.trim();
  }
  // Only send x-gemini-model when an explicit override is chosen so server GEMINI_MODEL applies by default
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
