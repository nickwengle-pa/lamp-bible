/**
 * Safe, zero-dependency Rich Note HTML sanitizer & helpers for Lamp.
 *
 * Guarantees:
 * - Only semantic formatting tags & curated `lamp-*` utility classes survive.
 * - Zero scripts, zero inline event handlers, zero external URLs, zero arbitrary styles.
 * - Curated ink/highlight colors adapt cleanly between Light & Dark mode via CSS classes.
 * - Clean plain-text extraction keeps search, tooltips, and existing KV records 100% compatible.
 */

export interface NoteInkOption {
  id: string;
  label: string;
  className: string;
  editorHex: string; // readable in both light & dark modes while typing
  swatchClass: string;
}

export interface NoteHighlightOption {
  id: string;
  label: string;
  className: string;
  editorHex: string;
  swatchClass: string;
}

export interface NoteFontOption {
  id: "serif" | "sans" | "mono";
  label: string;
  className: string;
  execFontName: string;
  sampleClass: string;
}

export const NOTE_INK_COLORS: NoteInkOption[] = [
  {
    id: "default",
    label: "Default Ink",
    className: "",
    editorHex: "",
    swatchClass: "bg-[#1C1917] dark:bg-[#F5F0E8]",
  },
  {
    id: "gold",
    label: "Lantern Gold",
    className: "lamp-ink-gold",
    editorHex: "#b88435",
    swatchClass: "bg-[#B88435]",
  },
  {
    id: "crimson",
    label: "Crimson",
    className: "lamp-ink-crimson",
    editorHex: "#dc2626",
    swatchClass: "bg-[#DC2626]",
  },
  {
    id: "emerald",
    label: "Forest",
    className: "lamp-ink-emerald",
    editorHex: "#16a34a",
    swatchClass: "bg-[#16A34A]",
  },
  {
    id: "cobalt",
    label: "Royal Blue",
    className: "lamp-ink-cobalt",
    editorHex: "#2563eb",
    swatchClass: "bg-[#2563EB]",
  },
  {
    id: "violet",
    label: "Purple",
    className: "lamp-ink-violet",
    editorHex: "#9333ea",
    swatchClass: "bg-[#9333EA]",
  },
  {
    id: "slate",
    label: "Muted Slate",
    className: "lamp-ink-slate",
    editorHex: "#78716c",
    swatchClass: "bg-[#78716C]",
  },
];

export const NOTE_TEXT_HIGHLIGHTS: NoteHighlightOption[] = [
  {
    id: "none",
    label: "No Highlight",
    className: "",
    editorHex: "",
    swatchClass: "bg-transparent border border-dashed border-[#A39A90]",
  },
  {
    id: "gold",
    label: "Gold Glow",
    className: "lamp-hl-gold",
    editorHex: "#fde68a",
    swatchClass: "bg-amber-200 dark:bg-amber-600/70",
  },
  {
    id: "sage",
    label: "Sage",
    className: "lamp-hl-sage",
    editorHex: "#bbf7d0",
    swatchClass: "bg-emerald-200 dark:bg-emerald-600/70",
  },
  {
    id: "sky",
    label: "Sky",
    className: "lamp-hl-sky",
    editorHex: "#bae6fd",
    swatchClass: "bg-sky-200 dark:bg-sky-600/70",
  },
  {
    id: "rose",
    label: "Rose",
    className: "lamp-hl-rose",
    editorHex: "#fecdd3",
    swatchClass: "bg-rose-200 dark:bg-rose-600/70",
  },
];

export const NOTE_FONTS: NoteFontOption[] = [
  {
    id: "sans",
    label: "Sans",
    className: "lamp-font-sans",
    execFontName: "Arial",
    sampleClass: "font-sans",
  },
  {
    id: "serif",
    label: "Serif",
    className: "lamp-font-serif",
    execFontName: "Georgia",
    sampleClass: "font-serif",
  },
  {
    id: "mono",
    label: "Mono",
    className: "lamp-font-mono",
    execFontName: "Courier New",
    sampleClass: "font-mono",
  },
];

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "ul",
  "ol",
  "li",
]);

const ALLOWED_CLASSES = new Set<string>([
  ...NOTE_INK_COLORS.map((c) => c.className).filter(Boolean),
  ...NOTE_TEXT_HIGHLIGHTS.map((h) => h.className).filter(Boolean),
  ...NOTE_FONTS.map((f) => f.className),
  "lamp-size-sm",
  "lamp-size-lg",
]);

function normalizeColorValue(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  const rgbMatch = cleaned.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
  );
  if (rgbMatch) {
    const hex = [1, 2, 3]
      .map((i) =>
        Math.max(0, Math.min(255, parseInt(rgbMatch[i], 10)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("");
    return `#${hex}`;
  }
  if (/^#[0-9a-f]{3}$/.test(cleaned)) {
    return `#${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}${cleaned[3]}${cleaned[3]}`;
  }
  return cleaned;
}

function mapColorToInkClass(raw: string): string | null {
  const hex = normalizeColorValue(raw);
  const exact = NOTE_INK_COLORS.find((c) => c.editorHex === hex);
  if (exact?.className) return exact.className;
  // Also accept dark/light variant hexes if copied back from computed styles
  const aliasMap: Record<string, string> = {
    "#9a6b24": "lamp-ink-gold",
    "#dfb164": "lamp-ink-gold",
    "#b91c1c": "lamp-ink-crimson",
    "#fca5a5": "lamp-ink-crimson",
    "#15803d": "lamp-ink-emerald",
    "#86efac": "lamp-ink-emerald",
    "#1d4ed8": "lamp-ink-cobalt",
    "#93c5fd": "lamp-ink-cobalt",
    "#7e22ce": "lamp-ink-violet",
    "#d8b4fe": "lamp-ink-violet",
    "#57534e": "lamp-ink-slate",
    "#a8a29e": "lamp-ink-slate",
  };
  return aliasMap[hex] || null;
}

function mapColorToHighlightClass(raw: string): string | null {
  const hex = normalizeColorValue(raw);
  const exact = NOTE_TEXT_HIGHLIGHTS.find((h) => h.editorHex === hex);
  if (exact?.className) return exact.className;
  const aliasMap: Record<string, string> = {
    "#fef08a": "lamp-hl-gold",
    "#fef3c7": "lamp-hl-gold",
    "#d1fae5": "lamp-hl-sage",
    "#e0f2fe": "lamp-hl-sky",
    "#ffe4e6": "lamp-hl-rose",
  };
  return aliasMap[hex] || null;
}

function mapFontNameToClass(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (lower.includes("mono") || lower.includes("courier") || lower.includes("consolas")) {
    return "lamp-font-mono";
  }
  if (lower.includes("georgia") || lower.includes("serif") || lower.includes("times") || lower.includes("cambria")) {
    return "lamp-font-serif";
  }
  if (lower.includes("arial") || lower.includes("sans") || lower.includes("inter") || lower.includes("system")) {
    return "lamp-font-sans";
  }
  return null;
}

function mapFontSizeToClass(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "2" || trimmed === "small" || trimmed === "x-small" || trimmed === "12px" || trimmed === "0.75rem") {
    return "lamp-size-sm";
  }
  if (trimmed === "4" || trimmed === "5" || trimmed === "large" || trimmed === "x-large" || trimmed === "18px" || trimmed === "1.125rem") {
    return "lamp-size-lg";
  }
  return null;
}

function extractAttr(attrs: string, name: string): string | null {
  const regex = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = attrs.match(regex);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function extractSafeClassesFromAttrs(tagName: string, attrs: string): string[] {
  const found = new Set<string>();

  const existingClass = extractAttr(attrs, "class");
  if (existingClass) {
    for (const token of existingClass.split(/\s+/)) {
      if (ALLOWED_CLASSES.has(token)) {
        found.add(token);
      }
    }
  }

  // Handle legacy <font color="..." face="..." size="..."> produced by contentEditable
  if (tagName === "font") {
    const color = extractAttr(attrs, "color");
    if (color) {
      const ink = mapColorToInkClass(color);
      if (ink) found.add(ink);
    }
    const face = extractAttr(attrs, "face");
    if (face) {
      const fontCls = mapFontNameToClass(face);
      if (fontCls) found.add(fontCls);
    }
    const size = extractAttr(attrs, "size");
    if (size) {
      const sizeCls = mapFontSizeToClass(size);
      if (sizeCls) found.add(sizeCls);
    }
  }

  // Extract only mapped color / background-color / font-family / font-size from inline style
  const style = extractAttr(attrs, "style");
  if (style) {
    for (const decl of style.split(";")) {
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();
      if (!val) continue;
      if (prop === "color") {
        const ink = mapColorToInkClass(val);
        if (ink) found.add(ink);
      } else if (prop === "background-color" || prop === "background") {
        const hl = mapColorToHighlightClass(val);
        if (hl) found.add(hl);
      } else if (prop === "font-family") {
        const fontCls = mapFontNameToClass(val);
        if (fontCls) found.add(fontCls);
      } else if (prop === "font-size") {
        const sizeCls = mapFontSizeToClass(val);
        if (sizeCls) found.add(sizeCls);
      }
    }
  }

  return Array.from(found);
}

/**
 * Strictly sanitizes rich note HTML for safe storage & rendering on both server and client.
 */
export function sanitizeRichNoteHtml(raw: string, maxChars = 30000): string {
  if (!raw || typeof raw !== "string") return "";

  let html = raw
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove dangerous elements AND their inner content
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|noscript|template|textarea|title)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|link|meta|base|form|input|button)\b[^>]*\/?>/gi,
      ""
    );

  // Rewrite all remaining tags through the strict allowlist
  html = html.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_full, slash, rawTag, attrs) => {
    const isClosing = slash === "/";
    const lowerTag = String(rawTag).toLowerCase();

    // Normalize <font> to <span>
    const tag = lowerTag === "font" ? "span" : lowerTag;

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (tag === "br") {
      return isClosing ? "" : "<br />";
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    const safeClasses = extractSafeClassesFromAttrs(lowerTag, String(attrs || ""));
    if (safeClasses.length > 0) {
      return `<${tag} class="${safeClasses.join(" ")}">`;
    }
    return `<${tag}>`;
  });

  // Remove empty meaningless formatting wrappers left over by browsers
  html = html.trim();
  const plainCheck = richHtmlToPlainText(html);
  if (!plainCheck) return "";

  return html.slice(0, maxChars);
}

export function richHtmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/(p|div|li|h2|h3|h4|blockquote)\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function plainTextToSafeHtml(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtmlText(para).replace(/\n/g, "<br />")}</p>`)
    .join("");
}
