"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  X,
  BookmarkPlus,
  Search,
  AlertCircle,
  Check,
  Languages,
  Compass,
  HeartHandshake,
  Layers,
  Highlighter,
  StickyNote,
  Mic,
} from "lucide-react";
import {
  AppSettings,
  BibleChapterResponse,
  BibleVerse,
  HighlightColor,
  StudyNote,
  VerseHighlight,
  VerseInsight,
} from "@/lib/types";
import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  parseScriptureReference,
} from "@/lib/bible-books";
import { aiHeaders, bibleHeaders } from "@/lib/client-api";
import AskVesselChat from "./AskVesselChat";

interface BibleReaderViewProps {
  settings: AppSettings;
  initialBook: string;
  initialChapter: number;
  highlightVerse?: number;
  notes: StudyNote[];
  highlights: Record<string, VerseHighlight>;
  onSaveHighlight: (
    book: string,
    chapter: number,
    verse: number,
    color: HighlightColor,
    note?: string
  ) => Promise<void>;
  onDeleteHighlight: (key: string) => Promise<void>;
  onOpenLibraryNote: (noteId: string) => void;
  onSaveVerseNote: (note: Partial<StudyNote>) => Promise<StudyNote | null>;
  onOpenSettings: () => void;
}

const HIGHLIGHT_STYLES: Record<
  HighlightColor,
  { bg: string; swatch: string; label: string }
> = {
  gold: {
    bg: "bg-amber-200/55 dark:bg-amber-800/35",
    swatch: "bg-amber-400",
    label: "Gold",
  },
  sage: {
    bg: "bg-emerald-200/50 dark:bg-emerald-800/35",
    swatch: "bg-emerald-400",
    label: "Sage",
  },
  sky: {
    bg: "bg-sky-200/50 dark:bg-sky-800/35",
    swatch: "bg-sky-400",
    label: "Sky",
  },
  rose: {
    bg: "bg-rose-200/50 dark:bg-rose-800/35",
    swatch: "bg-rose-400",
    label: "Rose",
  },
};

export default function BibleReaderView({
  settings,
  initialBook,
  initialChapter,
  highlightVerse,
  notes,
  highlights,
  onSaveHighlight,
  onDeleteHighlight,
  onOpenLibraryNote,
  onSaveVerseNote,
  onOpenSettings,
}: BibleReaderViewProps) {
  const [book, setBook] = useState(initialBook || "John");
  const [chapter, setChapter] = useState(initialChapter || 15);
  const [translation, setTranslation] = useState(
    settings.defaultTranslation || "esv"
  );
  const [activeHighlight, setActiveHighlight] = useState<number | undefined>(
    highlightVerse
  );

  const [chapterData, setChapterData] = useState<BibleChapterResponse | null>(
    null
  );
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  // Navigation Picker & Quick Jump
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTestament, setPickerTestament] = useState<"OT" | "NT">("NT");
  const [quickJump, setQuickJump] = useState("");

  // Verse Insight Panel & Margin Note Draft
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [marginNoteDraft, setMarginNoteDraft] = useState("");
  const [savingMargin, setSavingMargin] = useState(false);
  const [insight, setInsight] = useState<VerseInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [savedVerseSuccess, setSavedVerseSuccess] = useState(false);

  // Cross-link saved sermons/studies referencing this chapter!
  const relatedNotes = React.useMemo(() => {
    const matched: { note: StudyNote; verse?: number; reference: string }[] = [];
    for (const n of notes) {
      for (const ref of n.scriptureReferences || []) {
        const parsed = parseScriptureReference(ref.reference);
        if (parsed && parsed.book === book && parsed.chapter === chapter) {
          if (!matched.some((m) => m.note.id === n.id)) {
            matched.push({ note: n, verse: parsed.verse, reference: ref.reference });
          }
        }
      }
    }
    return matched;
  }, [notes, book, chapter]);

  // Sync external navigation (from Library or Scanner!)
  useEffect(() => {
    setBook(initialBook);
    setChapter(initialChapter);
    setActiveHighlight(highlightVerse);
  }, [initialBook, initialChapter, highlightVerse]);

  useEffect(() => {
    if (settings.defaultTranslation) {
      setTranslation(settings.defaultTranslation);
    }
  }, [settings.defaultTranslation]);

  const currentBookObj =
    BIBLE_BOOKS.find((b) => b.name === book) || BIBLE_BOOKS[42]; // John

  const loadChapter = useCallback(
    async (b: string, ch: number, trans: string) => {
      setLoadingChapter(true);
      setChapterError(null);
      try {
        const res = await fetch(
          `/api/bible?passage=${encodeURIComponent(
            `${b} ${ch}`
          )}&translation=${encodeURIComponent(trans)}`,
          {
            headers: bibleHeaders(settings),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not load Bible chapter.");
        }
        setChapterData(data);
      } catch (err) {
        setChapterError(
          err instanceof Error ? err.message : "Failed to fetch scripture."
        );
      } finally {
        setLoadingChapter(false);
      }
    },
    [settings.esvApiKey]
  );

  useEffect(() => {
    loadChapter(book, chapter, translation);
  }, [book, chapter, translation, loadChapter]);

  // Auto-scroll highlighted verse into view
  useEffect(() => {
    if (!activeHighlight || !chapterData) return;
    const el = document.getElementById(`verse-${activeHighlight}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeHighlight, chapterData]);

  const handlePrevChapter = () => {
    if (chapter > 1) {
      setChapter(chapter - 1);
      setActiveHighlight(undefined);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx > 0) {
        const prevBook = BIBLE_BOOKS[idx - 1];
        setBook(prevBook.name);
        setChapter(prevBook.chapters);
        setActiveHighlight(undefined);
      }
    }
  };

  const handleNextChapter = () => {
    if (chapter < currentBookObj.chapters) {
      setChapter(chapter + 1);
      setActiveHighlight(undefined);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.name === book);
      if (idx < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[idx + 1];
        setBook(nextBook.name);
        setChapter(1);
        setActiveHighlight(undefined);
      }
    }
  };

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseScriptureReference(quickJump);
    if (parsed) {
      setBook(parsed.book);
      setChapter(parsed.chapter);
      setActiveHighlight(parsed.verse);
      setQuickJump("");
    }
  };

  const handleVerseClick = async (v: BibleVerse) => {
    setSelectedVerse(v);
    const vKey = `${v.book_name}:${v.chapter}:${v.verse}`;
    setMarginNoteDraft(highlights[vKey]?.note || "");
    setInsight(null);
    setInsightError(null);
    setSavedVerseSuccess(false);
    setLoadingInsight(true);

    const ref = `${v.book_name} ${v.chapter}:${v.verse}`;
    const surrounding = (chapterData?.verses || [])
      .filter((item) => Math.abs(item.verse - v.verse) <= 2)
      .map((item) => `${item.verse}. ${item.text.trim()}`)
      .join(" ");

    try {
      const res = await fetch("/api/ai/verse-insight", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          reference: ref,
          verseText: v.text.trim(),
          translation: translation.toUpperCase(),
          surroundingContext: surrounding,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not load verse insight.");
      }
      setInsight(data.insight);
    } catch (err) {
      setInsightError(
        err instanceof Error ? err.message : "Failed to load insight."
      );
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleSaveInsightToLibrary = async () => {
    if (!insight) return;
    const saved = await onSaveVerseNote({
      title: `Verse Study: ${insight.reference}`,
      sourceType: "verse",
      tags: [book, `Chapter ${chapter}`, "Verse Study"],
      summary: insight.deeperMeaning,
      keyThemes: [
        ...insight.keyWordStudy.map((k) => `${k.term} (${k.originalLanguage})`),
      ],
      outline: [
        {
          heading: "Historical & Literary Context",
          points: [
            `Historical Background: ${insight.historicalContext}`,
            `Intended Audience: ${insight.intendedAudience}`,
            `Literary Flow: ${insight.literaryContext}`,
          ],
        },
        ...(insight.keyWordStudy.length
          ? [
              {
                heading: "Original Language Word Study",
                points: insight.keyWordStudy.map(
                  (w) => `${w.term} (${w.originalLanguage}): ${w.meaning}`
                ),
              },
            ]
          : []),
      ],
      scriptureReferences: [
        { reference: insight.reference, context: `"${insight.verseText}"` },
        ...insight.crossReferences.map((c) => ({
          reference: c.reference,
          context: c.connection,
        })),
      ],
      actionableTakeaways: insight.lifeApplication.map((text, idx) => ({
        id: `verse-act-${Date.now()}-${idx}`,
        text,
        completed: false,
      })),
      reflectionQuestions: [insight.prayerPrompt],
      personalNotes: `"${insight.verseText}" (${insight.reference}, ${insight.translation})`,
    });
    if (saved) {
      setSavedVerseSuccess(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Top Reader Toolbar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-[#FAF7F2]/95 dark:bg-[#141210]/95 backdrop-blur-md border-b border-[#E6DCCB] dark:border-[#2A2520] mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Book / Chapter Selector */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevChapter}
              className="p-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition"
              title="Previous chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="px-4 py-2 rounded-xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#DFD5C5] dark:border-[#36302A] hover:border-[#B88435] font-serif text-base font-semibold inline-flex items-center gap-2 transition"
            >
              <BookOpen className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164]" />
              {book} {chapter}
            </button>

            <button
              onClick={handleNextChapter}
              className="p-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition"
              title="Next chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Jump + Translation */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <form onSubmit={handleQuickJump} className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 text-[#8C8278] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickJump}
                onChange={(e) => setQuickJump(e.target.value)}
                placeholder="Jump: e.g. Romans 8:28"
                className="w-48 pl-8 pr-3 py-1.5 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FDFCFA] dark:bg-[#1D1A17] text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
              />
            </form>

            <select
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FDFCFA] dark:bg-[#1D1A17] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            >
              {BIBLE_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Book & Chapter Dropdown Picker */}
        {pickerOpen && (
          <div className="mt-3 rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1.5">
                {(["OT", "NT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPickerTestament(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      pickerTestament === t
                        ? "bg-[#9A6B24] text-white"
                        : "bg-[#F2ECE1] dark:bg-[#2A2520] text-[#6B635B] dark:text-[#A39A90]"
                    }`}
                  >
                    {t === "OT" ? "Old Testament" : "New Testament"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-1 text-[#6B635B] hover:text-[#1C1917]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pb-3 border-b border-[#EFE8DC] dark:border-[#2A2520]">
              {BIBLE_BOOKS.filter((b) => b.testament === pickerTestament).map(
                (b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setBook(b.name);
                      setChapter(1);
                      setActiveHighlight(undefined);
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      b.name === book
                        ? "bg-[#F7EAD0] text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164] font-semibold"
                        : "hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520]"
                    }`}
                  >
                    {b.name}
                  </button>
                )
              )}
            </div>

            <div className="pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-2">
                {book} — Select Chapter
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {Array.from({ length: currentBookObj.chapters }, (_, i) => i + 1).map(
                  (num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setChapter(num);
                        setActiveHighlight(undefined);
                        setPickerOpen(false);
                      }}
                      className={`w-9 h-8 rounded-lg text-xs font-medium transition ${
                        num === chapter
                          ? "bg-[#9A6B24] text-white font-semibold"
                          : "bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] hover:border-[#B88435]"
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Split Layout: Scripture + Contextual Insight Drawer */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Scripture Column */}
        <div
          className={`${
            selectedVerse ? "lg:col-span-7" : "lg:col-span-10 lg:col-start-2"
          } rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-10 shadow-sm transition-all`}
        >
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#EFE8DC] dark:border-[#2A2520]">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold">
                {book} {chapter}
              </h1>
              <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-1">
                {chapterData?.translation_name || translation.toUpperCase()} · Tap any verse to highlight, add notes, or get AI insight
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-[#B88435]/70" />
          </div>

          {/* Cross-linked Sermons & Studies referencing this chapter */}
          {relatedNotes.length > 0 && (
            <div className="mb-6 rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-2">
                <Mic className="w-3.5 h-3.5" />
                Referenced in Your Study Library
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedNotes.map(({ note, reference }) => (
                  <button
                    key={note.id}
                    onClick={() => onOpenLibraryNote(note.id)}
                    className="text-left px-3 py-1.5 rounded-xl bg-white dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] hover:border-[#B88435] text-xs font-medium inline-flex items-center gap-1.5 transition"
                  >
                    <span className="text-[#9A6B24] dark:text-[#DFB164] font-semibold">
                      {reference}
                    </span>
                    <span className="text-[#6B635B] dark:text-[#A39A90]">·</span>
                    <span className="truncate max-w-[200px]">{note.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingChapter ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#6B635B] gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#9A6B24]" />
              <p className="text-sm">Opening {book} {chapter}...</p>
            </div>
          ) : chapterError ? (
            <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm space-y-2">
              <p>{chapterError}</p>
              {chapterError.toLowerCase().includes("esv") && (
                <button
                  onClick={onOpenSettings}
                  className="text-xs font-semibold underline"
                >
                  Open Settings to add your free ESV API token →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 font-serif text-[19px] leading-[1.85] text-[#24201C] dark:text-[#ECE5DA]">
              {chapterData?.verses.map((v) => {
                const isSelected = selectedVerse?.verse === v.verse;
                const isHighlighted = activeHighlight === v.verse;
                const vKey = `${v.book_name}:${v.chapter}:${v.verse}`;
                const savedHl = highlights[vKey];
                return (
                  <button
                    key={v.verse}
                    id={`verse-${v.verse}`}
                    onClick={() => handleVerseClick(v)}
                    className={`w-full text-left px-3 py-2 -mx-3 rounded-xl transition block group ${
                      isSelected
                        ? "bg-[#F7EAD0]/90 dark:bg-[#3A2D1B]/85 ring-1 ring-[#B88435]/70"
                        : savedHl
                        ? HIGHLIGHT_STYLES[savedHl.color].bg
                        : isHighlighted
                        ? "bg-[#F7EAD0]/45 dark:bg-[#33281A]/50"
                        : "hover:bg-[#FAF5EB] dark:hover:bg-[#25211C]"
                    }`}
                  >
                    <sup className="font-sans text-xs font-bold text-[#9A6B24] dark:text-[#DFB164] mr-2 select-none">
                      {v.verse}
                    </sup>
                    <span>{v.text.trim()}</span>
                    {savedHl?.note && (
                      <span className="mt-1 flex items-center gap-1.5 font-sans text-xs text-[#6B635B] dark:text-[#BDB4AA] italic">
                        <StickyNote className="w-3 h-3 text-[#9A6B24] shrink-0" />
                        <span className="line-clamp-1">{savedHl.note}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Chapter Nav */}
          <div className="mt-10 pt-6 border-t border-[#EFE8DC] dark:border-[#2A2520] flex items-center justify-between">
            <button
              onClick={handlePrevChapter}
              className="px-4 py-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Chapter
            </button>
            <button
              onClick={handleNextChapter}
              className="px-4 py-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition"
            >
              Next Chapter
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contextual Verse Insight Drawer */}
        {selectedVerse && (
          <aside className="lg:col-span-5 lg:sticky lg:top-20 rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#DFC9A3] dark:border-[#4A3A22] shadow-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#FAF4E8] dark:bg-[#251E15] border-b border-[#E9D7B6] dark:border-[#3C301E] flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Contextual Verse Insight
                </div>
                <h2 className="font-serif text-xl font-semibold mt-0.5">
                  {selectedVerse.book_name} {selectedVerse.chapter}:
                  {selectedVerse.verse}
                </h2>
              </div>
              <button
                onClick={() => setSelectedVerse(null)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
              <blockquote className="font-serif italic text-base leading-relaxed pl-3.5 border-l-2 border-[#B88435] text-[#3F3A35] dark:text-[#DED6CB]">
                &ldquo;{selectedVerse.text.trim()}&rdquo;
              </blockquote>

              {/* Highlight Color Swatches & Margin Note */}
              {(() => {
                const vKey = `${selectedVerse.book_name}:${selectedVerse.chapter}:${selectedVerse.verse}`;
                const existing = highlights[vKey];
                return (
                  <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] inline-flex items-center gap-1.5">
                        <Highlighter className="w-3.5 h-3.5 text-[#9A6B24]" />
                        Highlight & Margin Note
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(["gold", "sage", "sky", "rose"] as HighlightColor[]).map(
                          (color) => (
                            <button
                              key={color}
                              type="button"
                              title={`Highlight ${HIGHLIGHT_STYLES[color].label}`}
                              onClick={() =>
                                onSaveHighlight(
                                  selectedVerse.book_name,
                                  selectedVerse.chapter,
                                  selectedVerse.verse,
                                  color,
                                  marginNoteDraft
                                )
                              }
                              className={`w-5 h-5 rounded-full ${HIGHLIGHT_STYLES[color].swatch} transition transform hover:scale-110 ${
                                existing?.color === color
                                  ? "ring-2 ring-offset-2 ring-[#1C1917] dark:ring-white dark:ring-offset-[#141210]"
                                  : ""
                              }`}
                            />
                          )
                        )}
                        {existing && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteHighlight(vKey);
                              setMarginNoteDraft("");
                            }}
                            className="ml-1 text-[11px] text-rose-600 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={marginNoteDraft}
                        onChange={(e) => setMarginNoteDraft(e.target.value)}
                        placeholder="Add a personal margin note for this verse..."
                        className="flex-1 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                      />
                      <button
                        type="button"
                        disabled={savingMargin}
                        onClick={async () => {
                          setSavingMargin(true);
                          try {
                            await onSaveHighlight(
                              selectedVerse.book_name,
                              selectedVerse.chapter,
                              selectedVerse.verse,
                              existing?.color || "gold",
                              marginNoteDraft
                            );
                          } finally {
                            setSavingMargin(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold disabled:opacity-50 transition"
                      >
                        {savingMargin ? "..." : "Save"}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {loadingInsight && (
                <div className="py-10 flex flex-col items-center gap-2.5 text-sm text-[#6B635B] dark:text-[#A39A90]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#9A6B24]" />
                  <span>Researching historical context & original languages...</span>
                </div>
              )}

              {insightError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p>{insightError}</p>
                    {insightError.toLowerCase().includes("api key") && (
                      <button
                        onClick={onOpenSettings}
                        className="mt-1.5 font-semibold underline"
                      >
                        Add your Gemini API key in Settings →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {insight && !loadingInsight && (
                <>
                  <div className="space-y-3 text-sm leading-relaxed">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-1">
                        <Compass className="w-3.5 h-3.5" />
                        Historical Context & Audience
                      </h3>
                      <p className="text-[#3F3A35] dark:text-[#D5CDC2]">
                        {insight.historicalContext}
                      </p>
                      <p className="mt-1.5 text-xs text-[#6B635B] dark:text-[#A39A90]">
                        <strong>Original Audience:</strong> {insight.intendedAudience}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-1">
                        <Layers className="w-3.5 h-3.5" />
                        Deeper Meaning
                      </h3>
                      <p className="text-[#3F3A35] dark:text-[#D5CDC2]">
                        {insight.deeperMeaning}
                      </p>
                    </div>

                    {insight.keyWordStudy.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-2">
                          <Languages className="w-3.5 h-3.5" />
                          Original Word Study
                        </h3>
                        <div className="space-y-2">
                          {insight.keyWordStudy.map((w, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#EBE2D3] dark:border-[#2C2721]"
                            >
                              <p className="text-xs font-semibold">
                                {w.term}{" "}
                                <span className="font-normal text-[#9A6B24] dark:text-[#DFB164]">
                                  ({w.originalLanguage})
                                </span>
                              </p>
                              <p className="text-xs text-[#574F47] dark:text-[#BDB4AA] mt-0.5">
                                {w.meaning}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insight.crossReferences.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-1.5">
                          Cross-References
                        </h3>
                        <div className="space-y-1.5">
                          {insight.crossReferences.map((cr, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const parsed = parseScriptureReference(cr.reference);
                                if (parsed) {
                                  setBook(parsed.book);
                                  setChapter(parsed.chapter);
                                  setActiveHighlight(parsed.verse);
                                  setSelectedVerse(null);
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#141210] hover:border-[#B88435] border border-transparent transition"
                            >
                              <span className="text-xs font-semibold text-[#9A6B24] dark:text-[#DFB164]">
                                {cr.reference}
                              </span>
                              <p className="text-xs text-[#574F47] dark:text-[#BDB4AA] mt-0.5">
                                {cr.connection}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {insight.lifeApplication.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-1.5">
                          <HeartHandshake className="w-3.5 h-3.5" />
                          Life Application
                        </h3>
                        <ul className="space-y-1.5 text-xs text-[#3F3A35] dark:text-[#D5CDC2]">
                          {insight.lifeApplication.map((app, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-[#9A6B24]">•</span>
                              <span>{app}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.prayerPrompt && (
                      <div className="p-3.5 rounded-xl bg-[#F7EAD0]/45 dark:bg-[#2B2216] border border-[#E6D1A9] dark:border-[#443520]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-1">
                          Prayer Prompt
                        </p>
                        <p className="font-serif italic text-sm text-[#3F3A35] dark:text-[#E5DDD2]">
                          {insight.prayerPrompt}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSaveInsightToLibrary}
                    disabled={savedVerseSuccess}
                    className="w-full py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#322C27] dark:bg-[#DFB164] dark:text-[#141210] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-65"
                  >
                    {savedVerseSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-900" />
                        Saved to Study Library
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4" />
                        Save Verse Study to Library
                      </>
                    )}
                  </button>

                  {/* Follow-up Ask Vessel Chat for this verse */}
                  <AskVesselChat
                    settings={settings}
                    compact
                    contextType="bible"
                    contextTitle={`${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`}
                    contextBody={`Verse (${translation.toUpperCase()}): "${selectedVerse.text.trim()}"\nHistorical Context: ${insight.historicalContext}\nDeeper Meaning: ${insight.deeperMeaning}`}
                    suggestions={[
                      "How does this connect to Jesus?",
                      "Give a real-life example of living this out",
                    ]}
                  />
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
