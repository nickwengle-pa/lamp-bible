"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  RemoveFormatting,
  Highlighter,
  Palette,
  Type,
  CheckSquare,
  Save,
  Loader2,
  Trash2,
  PenLine,
  BookOpen,
} from "lucide-react";
import { HighlightColor } from "@/lib/types";
import {
  NOTE_FONTS,
  NOTE_INK_COLORS,
  NOTE_TEXT_HIGHLIGHTS,
  plainTextToSafeHtml,
  richHtmlToPlainText,
  sanitizeRichNoteHtml,
} from "@/lib/rich-text";
import {
  DetectedScriptureRef,
  extractScriptureReferences,
  findScriptureMatchesInText,
} from "@/lib/scripture-links";

interface RichNoteModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  quotePreview?: string;
  initialPlainText: string;
  initialHtml?: string;
  highlightColor?: HighlightColor;
  showHighlightPicker?: boolean;
  placeholder?: string;
  saving?: boolean;
  onSave: (payload: {
    plainText: string;
    html: string;
    highlightColor?: HighlightColor;
  }) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
  onOpenScripture?: (reference: string) => void;
}

const VERSE_HIGHLIGHT_SWATCHES: {
  id: HighlightColor;
  label: string;
  swatch: string;
}[] = [
  { id: "gold", label: "Gold", swatch: "bg-amber-400" },
  { id: "sage", label: "Sage", swatch: "bg-emerald-400" },
  { id: "sky", label: "Sky", swatch: "bg-sky-400" },
  { id: "rose", label: "Rose", swatch: "bg-rose-400" },
];

type BlockStyleId = "p" | "h3" | "h4" | "blockquote";
type TextSizeId = "sm" | "md" | "lg";

function getCaretOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const preStart = range.cloneRange();
  preStart.selectNodeContents(root);
  preStart.setEnd(range.startContainer, range.startOffset);
  const start = preStart.toString().length;

  const preEnd = range.cloneRange();
  preEnd.selectNodeContents(root);
  preEnd.setEnd(range.endContainer, range.endOffset);
  const end = preEnd.toString().length;

  return { start, end };
}

function restoreCaretOffsets(root: HTMLElement, offsets: { start: number; end: number }) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startNode: Node | null = null;
  let startOff = 0;
  let endNode: Node | null = null;
  let endOff = 0;

  let current = walker.nextNode();
  while (current) {
    const len = current.textContent?.length ?? 0;
    if (!startNode && offsets.start <= pos + len) {
      startNode = current;
      startOff = Math.max(0, offsets.start - pos);
    }
    if (!endNode && offsets.end <= pos + len) {
      endNode = current;
      endOff = Math.max(0, offsets.end - pos);
      break;
    }
    pos += len;
    current = walker.nextNode();
  }

  if (!startNode) return;
  try {
    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode || startNode, endNode ? endOff : startOff);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch {
    // ignore DOM range restore failures
  }
}

/**
 * Highlights detected Scripture references as inline `.lamp-scripture-link` spans
 * directly inside the contentEditable editor, preserving the user's exact caret position
 * and short-circuiting with zero DOM changes if links haven't changed.
 */
function syncInlineScriptureLinks(root: HTMLElement): boolean {
  const existingLinks = Array.from(
    root.querySelectorAll<HTMLElement>("span.lamp-scripture-link[data-scripture-ref]")
  );
  const currentSig = existingLinks
    .map((n) => `${n.dataset.scriptureRef}:${n.textContent || ""}`)
    .join("|");

  // Compute expected matches across current plain text
  const expectedMatches = findScriptureMatchesInText(root.innerText || root.textContent || "");
  const expectedSig = expectedMatches
    .map((m) => `${m.canonical}:${m.matchText}`)
    .join("|");

  if (currentSig === expectedSig) {
    return false;
  }

  const savedOffsets = getCaretOffsets(root);

  // Unwrap old inline scripture link spans first
  for (const span of existingLinks) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  }
  root.normalize();

  // Collect all text nodes now and wrap Scripture references inline
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent && node.textContent.trim()) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || "";
    const matches = findScriptureMatchesInText(text);
    if (!matches.length) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const m of matches) {
      if (m.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      }
      const span = document.createElement("span");
      span.className = "lamp-scripture-link";
      span.dataset.scriptureRef = m.canonical;
      span.title = `Click to open ${m.canonical} in Bible Reader`;
      span.textContent = text.slice(m.start, m.end);
      frag.appendChild(span);
      cursor = m.end;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  if (savedOffsets) {
    restoreCaretOffsets(root, savedOffsets);
  }
  return true;
}

export default function RichNoteModal({
  open,
  onClose,
  title,
  subtitle,
  quotePreview,
  initialPlainText,
  initialHtml,
  highlightColor = "gold",
  showHighlightPicker = false,
  placeholder = "Write your study notes, observations, prayers, or outline here...",
  saving = false,
  onSave,
  onClear,
  onOpenScripture,
}: RichNoteModalProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isComposingRef = useRef(false);
  const linkSyncTimerRef = useRef<number | null>(null);

  const [selectedHighlight, setSelectedHighlight] =
    useState<HighlightColor>(highlightColor);
  const [activeTray, setActiveTray] = useState<"none" | "ink" | "highlight">(
    "none"
  );
  const [activeInkId, setActiveInkId] = useState("default");
  const [activeHlId, setActiveHlId] = useState("none");
  const [blockStyle, setBlockStyle] = useState<BlockStyleId>("p");
  const [fontChoice, setFontChoice] = useState<"sans" | "serif" | "mono">("sans");
  const [textSize, setTextSize] = useState<TextSizeId>("md");
  const [wordCount, setWordCount] = useState(0);
  const [hasContent, setHasContent] = useState(false);
  const [detectedRefs, setDetectedRefs] = useState<DetectedScriptureRef[]>([]);
  const navigatingLinkRef = useRef(false);

  // Active formatting flags for toolbar visual feedback
  const [fmtState, setFmtState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
  });

  const updateCounts = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const plain = richHtmlToPlainText(el.innerHTML);
    setHasContent(plain.length > 0);
    setWordCount(plain ? plain.split(/\s+/).filter(Boolean).length : 0);
    setDetectedRefs(extractScriptureReferences(plain).slice(0, 8));
  }, []);

  const captureSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRangeRef.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch {
        // Range no longer valid; leave focus in editor
      }
    }
  }, []);

  const refreshFormatState = useCallback(() => {
    captureSelection();
    try {
      setFmtState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
      });
      const block = (document.queryCommandValue("formatBlock") || "")
        .replace(/[<>]/g, "")
        .toLowerCase();
      if (block === "h3" || block === "h4" || block === "blockquote") {
        setBlockStyle(block);
      } else {
        setBlockStyle("p");
      }
    } catch {
      // queryCommandState may throw in non-editable edge states
    }
  }, [captureSelection]);

  const scheduleInlineLinkSync = useCallback((immediate = false) => {
    if (linkSyncTimerRef.current !== null) {
      window.clearTimeout(linkSyncTimerRef.current);
      linkSyncTimerRef.current = null;
    }
    const run = () => {
      if (isComposingRef.current) return;
      const el = editorRef.current;
      if (!el) return;
      syncInlineScriptureLinks(el);
    };
    if (immediate) {
      run();
    } else {
      linkSyncTimerRef.current = window.setTimeout(run, 420);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (linkSyncTimerRef.current !== null) {
        window.clearTimeout(linkSyncTimerRef.current);
      }
    };
  }, []);

  // Hydrate content whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setSelectedHighlight(highlightColor);
    setActiveTray("none");
    setActiveInkId("default");
    setActiveHlId("none");
    setBlockStyle("p");
    setFontChoice("sans");
    setTextSize("md");
    navigatingLinkRef.current = false;

    const initialSafe = initialHtml
      ? sanitizeRichNoteHtml(initialHtml, 50000)
      : plainTextToSafeHtml(initialPlainText);

    const raf = window.requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.innerHTML = initialSafe;

      // Convert saved semantic lamp-* classes into live inline styles inside the
      // contentEditable canvas so execCommand color/font/removeFormat cleanly overrides them.
      el.querySelectorAll<HTMLElement>("[class]").forEach((node) => {
        const classes = Array.from(node.classList);
        for (const cls of classes) {
          const ink = NOTE_INK_COLORS.find((c) => c.className === cls);
          if (ink?.editorHex) {
            node.style.color = ink.editorHex;
            node.classList.remove(cls);
            continue;
          }
          const hl = NOTE_TEXT_HIGHLIGHTS.find((h) => h.className === cls);
          if (hl?.editorHex) {
            node.style.backgroundColor = hl.editorHex;
            node.classList.remove(cls);
            continue;
          }
          const font = NOTE_FONTS.find((f) => f.className === cls);
          if (font) {
            node.style.fontFamily = font.execFontName;
            node.classList.remove(cls);
            continue;
          }
          if (cls === "lamp-size-sm") {
            node.style.fontSize = "small";
            node.classList.remove(cls);
          } else if (cls === "lamp-size-lg") {
            node.style.fontSize = "large";
            node.classList.remove(cls);
          }
        }
        if (node.classList.length === 0) {
          node.removeAttribute("class");
        }
      });

      // Immediately highlight any existing Bible references inline right inside the note
      syncInlineScriptureLinks(el);
      updateCounts();

      // Focus and place caret at end of note
      el.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
          savedRangeRef.current = range.cloneRange();
        }
      } catch {
        // ignore selection init issues
      }
      refreshFormatState();
    });

    return () => window.cancelAnimationFrame(raf);
  }, [open, initialHtml, initialPlainText, highlightColor, updateCounts, refreshFormatState]);

  const handleSave = useCallback(async () => {
    const el = editorRef.current;
    if (!el || saving) return;
    const safeHtml = sanitizeRichNoteHtml(el.innerHTML, 50000);
    const plainText = richHtmlToPlainText(safeHtml);
    await onSave({
      plainText,
      html: safeHtml,
      highlightColor: showHighlightPicker ? selectedHighlight : undefined,
    });
  }, [onSave, saving, selectedHighlight, showHighlightPicker]);

  // Escape closes ONLY this stacked modal; Ctrl/Cmd+S saves immediately
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose, handleSave]);

  if (!open) return null;

  const exec = (command: string, value?: string) => {
    restoreSelection();
    try {
      document.execCommand(command, false, value);
    } catch {
      // ignore unsupported browser command
    }
    captureSelection();
    updateCounts();
    refreshFormatState();
  };

  const handleApplyBlockStyle = (next: BlockStyleId) => {
    setBlockStyle(next);
    const tagMap: Record<BlockStyleId, string> = {
      p: "P",
      h3: "H3",
      h4: "H4",
      blockquote: "BLOCKQUOTE",
    };
    exec("formatBlock", tagMap[next]);
  };

  const handleApplyFont = (next: "sans" | "serif" | "mono") => {
    setFontChoice(next);
    const opt = NOTE_FONTS.find((f) => f.id === next);
    if (opt) {
      exec("fontName", opt.execFontName);
    }
  };

  const handleApplyTextSize = (next: TextSizeId) => {
    setTextSize(next);
    const sizeArg = next === "sm" ? "2" : next === "lg" ? "5" : "3";
    exec("fontSize", sizeArg);
  };

  const handleApplyInkColor = (inkId: string) => {
    setActiveInkId(inkId);
    const opt = NOTE_INK_COLORS.find((c) => c.id === inkId);
    if (!opt || !opt.editorHex) {
      // Reset color cleanly to theme default
      restoreSelection();
      try {
        const isDark = document.documentElement.classList.contains("dark");
        document.execCommand("foreColor", false, isDark ? "#F5F0E8" : "#1C1917");
      } catch {
        // ignore
      }
      captureSelection();
      updateCounts();
      return;
    }
    exec("foreColor", opt.editorHex);
  };

  const handleApplyTextHighlight = (hlId: string) => {
    setActiveHlId(hlId);
    const opt = NOTE_TEXT_HIGHLIGHTS.find((h) => h.id === hlId);
    if (!opt || !opt.editorHex) {
      exec("hiliteColor", "transparent");
      return;
    }
    restoreSelection();
    try {
      const ok = document.execCommand("hiliteColor", false, opt.editorHex);
      if (!ok) {
        document.execCommand("backColor", false, opt.editorHex);
      }
    } catch {
      // ignore
    }
    captureSelection();
    updateCounts();
    refreshFormatState();
  };

  const handleInsertChecklist = () => {
    restoreSelection();
    try {
      document.execCommand("insertHTML", false, "<div>☐&nbsp;</div>");
    } catch {
      document.execCommand("insertText", false, "\n☐ ");
    }
    captureSelection();
    updateCounts();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const safeInsert = html
      ? sanitizeRichNoteHtml(html, 20000)
      : plainTextToSafeHtml(text);
    if (safeInsert) {
      try {
        document.execCommand("insertHTML", false, safeInsert);
      } catch {
        document.execCommand("insertText", false, text);
      }
      updateCounts();
      scheduleInlineLinkSync(true);
      refreshFormatState();
    }
  };

  const activeInkObj =
    NOTE_INK_COLORS.find((c) => c.id === activeInkId) || NOTE_INK_COLORS[0];
  const activeHlObj =
    NOTE_TEXT_HIGHLIGHTS.find((h) => h.id === activeHlId) ||
    NOTE_TEXT_HIGHLIGHTS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border-t sm:border border-[#DFC9A3] dark:border-[#4A3A22] shadow-2xl overflow-hidden">
        {/* Stacked Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#FAF4E8] dark:bg-[#251E15] border-b border-[#E9D7B6] dark:border-[#3C301E] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9A6B24] dark:text-[#DFB164]">
              <PenLine className="w-3.5 h-3.5" />
              Lamp Note Studio
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#1C1917] dark:text-[#F5F0E8] truncate mt-0.5">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[#6B635B] dark:text-[#A39A90] truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showHighlightPicker && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/80 dark:bg-black/25 border border-[#E6D1A9] dark:border-[#4A3A22]"
                title="Verse highlight color"
              >
                {VERSE_HIGHLIGHT_SWATCHES.map((sw) => (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => setSelectedHighlight(sw.id)}
                    aria-label={`Highlight verse ${sw.label}`}
                    title={`Highlight ${sw.label}`}
                    className={`w-4 h-4 rounded-full ${sw.swatch} transition transform hover:scale-110 ${
                      selectedHighlight === sw.id
                        ? "ring-2 ring-offset-1 ring-[#1C1917] dark:ring-white dark:ring-offset-[#1D1A17]"
                        : "opacity-75 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close note editor"
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#6B635B] dark:text-[#BDB4AA] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Verse Quote Banner */}
        {quotePreview && (
          <div className="px-4 sm:px-5 py-2 bg-[#FAF7F2] dark:bg-[#161310] border-b border-[#EFE8DC] dark:border-[#2A2520] shrink-0">
            <p className="font-serif italic text-xs text-[#574F47] dark:text-[#C5BCB0] line-clamp-2 pl-2.5 border-l-2 border-[#B88435]">
              &ldquo;{quotePreview}&rdquo;
            </p>
          </div>
        )}

        {/* Rich Formatting Toolbar */}
        <div className="px-3 sm:px-4 py-2 bg-[#FAF7F2] dark:bg-[#171411] border-b border-[#E6DCCB] dark:border-[#2F2A24] space-y-2 shrink-0">
          {/* Row 1: Word Type, Font Family, Text Size + Inline B/I/U/S */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Word Type (Block Style) */}
            <div className="inline-flex items-center rounded-lg border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-1.5">
              <Type className="w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164] mr-1 shrink-0" />
              <select
                aria-label="Text style"
                value={blockStyle}
                onChange={(e) =>
                  handleApplyBlockStyle(e.target.value as BlockStyleId)
                }
                className="bg-transparent py-1 pr-1 text-xs font-medium text-[#1C1917] dark:text-[#F5F0E8] focus:outline-none cursor-pointer"
              >
                <option value="p" className="bg-white dark:bg-[#1D1A17]">
                  Body
                </option>
                <option value="h3" className="bg-white dark:bg-[#1D1A17]">
                  Heading
                </option>
                <option value="h4" className="bg-white dark:bg-[#1D1A17]">
                  Subhead
                </option>
                <option value="blockquote" className="bg-white dark:bg-[#1D1A17]">
                  Quote
                </option>
              </select>
            </div>

            {/* Font Family (Word Type) */}
            <select
              aria-label="Font family"
              value={fontChoice}
              onChange={(e) =>
                handleApplyFont(e.target.value as "sans" | "serif" | "mono")
              }
              className="rounded-lg border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-2 py-1 text-xs font-medium text-[#1C1917] dark:text-[#F5F0E8] focus:outline-none cursor-pointer"
            >
              {NOTE_FONTS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  className="bg-white dark:bg-[#1D1A17]"
                >
                  {f.label}
                </option>
              ))}
            </select>

            {/* Text Size */}
            <select
              aria-label="Text size"
              value={textSize}
              onChange={(e) =>
                handleApplyTextSize(e.target.value as TextSizeId)
              }
              className="rounded-lg border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-2 py-1 text-xs font-medium text-[#1C1917] dark:text-[#F5F0E8] focus:outline-none cursor-pointer"
            >
              <option value="sm" className="bg-white dark:bg-[#1D1A17]">
                Small
              </option>
              <option value="md" className="bg-white dark:bg-[#1D1A17]">
                Normal
              </option>
              <option value="lg" className="bg-white dark:bg-[#1D1A17]">
                Large
              </option>
            </select>

            <span className="h-4 w-px bg-[#E6DCCB] dark:bg-[#322C26] mx-0.5 hidden sm:inline-block" />

            {/* Bold / Italic / Underline / Strike */}
            <div className="inline-flex items-center gap-0.5">
              {(
                [
                  { id: "bold", cmd: "bold", icon: Bold, label: "Bold", active: fmtState.bold },
                  { id: "italic", cmd: "italic", icon: Italic, label: "Italic", active: fmtState.italic },
                  { id: "underline", cmd: "underline", icon: Underline, label: "Underline", active: fmtState.underline },
                  { id: "strike", cmd: "strikeThrough", icon: Strikethrough, label: "Strikethrough", active: fmtState.strike },
                ] as const
              ).map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec(btn.cmd)}
                    aria-label={btn.label}
                    aria-pressed={btn.active}
                    title={btn.label}
                    className={`p-1.5 rounded-lg transition ${
                      btn.active
                        ? "bg-[#9A6B24] text-white dark:bg-[#DFB164] dark:text-[#141210]"
                        : "text-[#4A433C] dark:text-[#D1C9BE] hover:bg-[#EFE8DC] dark:hover:bg-[#2A2520]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Bullets, Numbering, Checklist, Quote, Font Color, Highlight, Undo/Redo */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {/* Bulleted List */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("insertUnorderedList")}
                aria-label="Bulleted list"
                aria-pressed={fmtState.ul}
                title="Bulleted list"
                className={`px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition ${
                  fmtState.ul
                    ? "bg-[#9A6B24] text-white dark:bg-[#DFB164] dark:text-[#141210]"
                    : "bg-white dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435]"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bullets</span>
              </button>

              {/* Numbered List */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("insertOrderedList")}
                aria-label="Numbered list"
                aria-pressed={fmtState.ol}
                title="Numbered list"
                className={`px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition ${
                  fmtState.ol
                    ? "bg-[#9A6B24] text-white dark:bg-[#DFB164] dark:text-[#141210]"
                    : "bg-white dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435]"
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Numbered</span>
              </button>

              {/* Checklist item */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleInsertChecklist}
                aria-label="Insert checklist item"
                title="Insert checklist item"
                className="px-2 py-1 rounded-lg bg-white dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435] text-xs font-medium inline-flex items-center gap-1 transition"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Check</span>
              </button>

              {/* Quote */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  handleApplyBlockStyle(
                    blockStyle === "blockquote" ? "p" : "blockquote"
                  )
                }
                aria-label="Toggle quote block"
                aria-pressed={blockStyle === "blockquote"}
                title="Quote block"
                className={`p-1.5 rounded-lg border transition ${
                  blockStyle === "blockquote"
                    ? "bg-[#9A6B24] border-[#9A6B24] text-white dark:bg-[#DFB164] dark:border-[#DFB164] dark:text-[#141210]"
                    : "bg-white dark:bg-[#1D1A17] border-[#E6DCCB] dark:border-[#322C26] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435]"
                }`}
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <span className="h-4 w-px bg-[#E6DCCB] dark:bg-[#322C26] mx-0.5" />

              {/* Font Color Toggle */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  setActiveTray((t) => (t === "ink" ? "none" : "ink"))
                }
                aria-label="Font color"
                aria-expanded={activeTray === "ink"}
                title="Font color"
                className={`px-2 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  activeTray === "ink"
                    ? "border-[#9A6B24] bg-[#F7EAD0]/80 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                    : "bg-white dark:bg-[#1D1A17] border-[#E6DCCB] dark:border-[#322C26] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435]"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Color</span>
                <span
                  style={
                    activeInkObj.editorHex
                      ? { backgroundColor: activeInkObj.editorHex }
                      : undefined
                  }
                  className={`w-3 h-3 rounded-full shrink-0 ring-1 ring-black/20 dark:ring-white/30 ${
                    activeInkObj.editorHex
                      ? ""
                      : "bg-[#1C1917] dark:bg-[#F5F0E8]"
                  }`}
                />
              </button>

              {/* Text Highlight Toggle */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  setActiveTray((t) => (t === "highlight" ? "none" : "highlight"))
                }
                aria-label="Text highlight color"
                aria-expanded={activeTray === "highlight"}
                title="Text highlight"
                className={`px-2 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  activeTray === "highlight"
                    ? "border-[#9A6B24] bg-[#F7EAD0]/80 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                    : "bg-white dark:bg-[#1D1A17] border-[#E6DCCB] dark:border-[#322C26] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435]"
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Mark</span>
                <span
                  style={
                    activeHlObj.editorHex
                      ? { backgroundColor: activeHlObj.editorHex }
                      : undefined
                  }
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    activeHlObj.editorHex
                      ? "ring-1 ring-black/20 dark:ring-white/30"
                      : "bg-transparent border border-dashed border-[#A39A90]"
                  }`}
                />
              </button>
            </div>

            {/* Undo / Redo / Clear Formatting */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("undo")}
                aria-label="Undo"
                title="Undo"
                className="p-1.5 rounded-lg text-[#6B635B] dark:text-[#A39A90] hover:bg-[#EFE8DC] dark:hover:bg-[#2A2520] transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("redo")}
                aria-label="Redo"
                title="Redo"
                className="p-1.5 rounded-lg text-[#6B635B] dark:text-[#A39A90] hover:bg-[#EFE8DC] dark:hover:bg-[#2A2520] transition"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  exec("removeFormat");
                  setActiveInkId("default");
                  setActiveHlId("none");
                }}
                aria-label="Clear formatting"
                title="Clear formatting"
                className="p-1.5 rounded-lg text-[#6B635B] dark:text-[#A39A90] hover:bg-[#EFE8DC] dark:hover:bg-[#2A2520] transition"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expandable Font Color Swatch Tray */}
          {activeTray === "ink" && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#EBE2D3] dark:border-[#2C2721]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mr-1">
                Font Color:
              </span>
              {NOTE_INK_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleApplyInkColor(c.id)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
                    activeInkId === c.id
                      ? "border-[#9A6B24] bg-[#F7EAD0]/75 dark:bg-[#3A2D1B] ring-1 ring-[#9A6B24]/30"
                      : "border-[#E6DCCB] dark:border-[#322C26] bg-white dark:bg-[#1D1A17] hover:border-[#B88435]"
                  }`}
                >
                  <span
                    style={
                      c.editorHex ? { backgroundColor: c.editorHex } : undefined
                    }
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/20 dark:ring-white/30 ${
                      c.editorHex ? "" : "bg-[#1C1917] dark:bg-[#F5F0E8]"
                    }`}
                  />
                  <span
                    style={c.editorHex ? { color: c.editorHex } : undefined}
                    className={
                      c.editorHex ? "" : "text-[#1C1917] dark:text-[#F5F0E8]"
                    }
                  >
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Expandable Text Highlight Swatch Tray */}
          {activeTray === "highlight" && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#EBE2D3] dark:border-[#2C2721]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mr-1">
                Text Marker:
              </span>
              {NOTE_TEXT_HIGHLIGHTS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleApplyTextHighlight(h.id)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
                    activeHlId === h.id
                      ? "border-[#9A6B24] bg-[#F7EAD0]/75 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                      : "border-[#E6DCCB] dark:border-[#322C26] bg-white dark:bg-[#1D1A17] text-[#4A433C] dark:text-[#D1C9BE] hover:border-[#B88435]"
                  }`}
                >
                  <span
                    style={
                      h.editorHex ? { backgroundColor: h.editorHex } : undefined
                    }
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      h.editorHex
                        ? "ring-1 ring-black/20 dark:ring-white/30"
                        : "bg-transparent border border-dashed border-[#A39A90]"
                    }`}
                  />
                  <span>{h.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacious Rich Writing Canvas */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white dark:bg-[#141210] p-4 sm:p-6">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Note content"
            data-placeholder={placeholder}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
              updateCounts();
              scheduleInlineLinkSync();
            }}
            onClick={async (e) => {
              const linkEl = (e.target as HTMLElement).closest<HTMLElement>(
                "[data-scripture-ref]"
              );
              const ref = linkEl?.dataset.scriptureRef;
              if (!ref || !onOpenScripture || saving || navigatingLinkRef.current) {
                return;
              }
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed) return;
              e.preventDefault();
              e.stopPropagation();
              navigatingLinkRef.current = true;
              try {
                await handleSave();
                onOpenScripture(ref);
              } finally {
                navigatingLinkRef.current = false;
              }
            }}
            onInput={() => {
              const el = editorRef.current;
              if (el && !richHtmlToPlainText(el.innerHTML) && el.innerHTML.trim() === "<br>") {
                el.innerHTML = "";
              }
              updateCounts();
              captureSelection();
              scheduleInlineLinkSync();
            }}
            onKeyUp={refreshFormatState}
            onMouseUp={refreshFormatState}
            onBlur={() => {
              captureSelection();
              scheduleInlineLinkSync(true);
            }}
            onPaste={handlePaste}
            className="lamp-rich-note min-h-[210px] sm:min-h-[260px] text-base sm:text-[15px] text-[#1C1917] dark:text-[#F5F0E8] focus:outline-none"
          />
        </div>

        {/* Live Detected Scripture Links Bar */}
        {detectedRefs.length > 0 && (
          <div className="px-4 sm:px-5 py-2 bg-[#FAF4E8]/85 dark:bg-[#211B14] border-t border-[#E9D7B6] dark:border-[#3A2E1E] flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mr-0.5">
              <BookOpen className="w-3 h-3" />
              Scripture Links:
            </span>
            {detectedRefs.map((ref) => (
              <button
                key={ref.canonical}
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!onOpenScripture) return;
                  await handleSave();
                  onOpenScripture(ref.canonical);
                }}
                title={
                  onOpenScripture
                    ? `Save note and open ${ref.canonical} in Bible Reader`
                    : `${ref.canonical} will be clickable when saved`
                }
                className="px-2 py-0.5 rounded-lg bg-white/95 dark:bg-[#17130E] border border-[#DFC9A3] dark:border-[#4A3A22] hover:border-[#9A6B24] text-[11px] font-semibold text-[#7B531A] dark:text-[#DFB164] inline-flex items-center gap-1 transition disabled:opacity-50"
              >
                <span>{ref.canonical}</span>
                {onOpenScripture && <span className="text-[10px] opacity-75">→</span>}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="px-4 sm:px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 bg-[#FAF7F2] dark:bg-[#171411] border-t border-[#E6DCCB] dark:border-[#2F2A24] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-[#786F66] dark:text-[#9C9288]">
            <span>
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <span className="hidden sm:inline">· Ctrl/⌘+S to save</span>
            {onClear && hasContent && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (editorRef.current) editorRef.current.innerHTML = "";
                  updateCounts();
                  await onClear();
                }}
                className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-medium"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] text-xs font-semibold text-[#574F47] dark:text-[#C9BFB3] hover:bg-[#EFE8DC] dark:hover:bg-[#25211D] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] dark:bg-[#DFB164] dark:hover:bg-[#E7C07D] text-white dark:text-[#141210] text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
