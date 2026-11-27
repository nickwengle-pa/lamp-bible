"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  Share2,
  Volume2,
  Star,
  Bookmark,
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
import { pronounceWord } from "@/lib/pronounce";
import AskVesselChat from "./AskVesselChat";
import ShareVerseModal from "./ShareVerseModal";

interface InterlinearWord {
  pos: number;
  language: string;
  text: string;
  transliteration: string;
  parsing: string;
  parsingFull: string;
  strongs: string;
  gloss: string;
}

interface LexiconEntry {
  strongs: string;
  lexeme: string;
  transliteration: string;
  pronunciation: string;
  shortDefinition: string;
  definitionLines: string[];
}

interface BibleReaderViewProps {
  settings: AppSettings;
  initialBook: string;
  initialChapter: number;
  initialTranslation?: string;
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
  embedded?: boolean;
  onExpandFullScreen?: (location: {
    book: string;
    chapter: number;
    verse?: number;
    translation: string;
  }) => void;
}

const HIGHLIGHT_STYLES: Record<
  HighlightColor,
  { bg: string; swatch: string; label: string }
> = {
  gold: {
    bg: "bg-amber-200/75 dark:bg-amber-700/45 decoration-clone rounded px-1 py-0.5",
    swatch: "bg-amber-400",
    label: "Gold",
  },
  sage: {
    bg: "bg-emerald-200/70 dark:bg-emerald-700/45 decoration-clone rounded px-1 py-0.5",
    swatch: "bg-emerald-400",
    label: "Sage",
  },
  sky: {
    bg: "bg-sky-200/70 dark:bg-sky-700/45 decoration-clone rounded px-1 py-0.5",
    swatch: "bg-sky-400",
    label: "Sky",
  },
  rose: {
    bg: "bg-rose-200/70 dark:bg-rose-700/45 decoration-clone rounded px-1 py-0.5",
    swatch: "bg-rose-400",
    label: "Rose",
  },
};

export default function BibleReaderView({
  settings,
  initialBook,
  initialChapter,
  initialTranslation,
  highlightVerse,
  notes,
  highlights,
  onSaveHighlight,
  onDeleteHighlight,
  onOpenLibraryNote,
  onSaveVerseNote,
  onOpenSettings,
  embedded = false,
  onExpandFullScreen,
}: BibleReaderViewProps) {
  const [book, setBook] = useState(initialBook || "John");
  const [chapter, setChapter] = useState(initialChapter || 1);
  const [translation, setTranslation] = useState(
    initialTranslation || settings.defaultTranslation || "bsb"
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
  const [selectedVerseTranslation, setSelectedVerseTranslation] = useState<string>(
    initialTranslation || settings.defaultTranslation || "bsb"
  );
  const [drawerTab, setDrawerTab] = useState<
    "explain" | "original" | "deep" | "related"
  >("explain");
  const [shareOpen, setShareOpen] = useState(false);
  const [marginNoteDraft, setMarginNoteDraft] = useState("");
  const [savingMargin, setSavingMargin] = useState(false);
  const [insight, setInsight] = useState<VerseInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [savedVerseSuccess, setSavedVerseSuccess] = useState(false);

  // Mobile swipeable Verse Study sheet state (swipe down to hide, swipe up or tap tab to reopen)
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetTouchRef = useRef<{
    startY: number;
    startTime: number;
    mode: "collapse" | "expand";
    fromScrollBody?: boolean;
    engaged?: boolean;
  } | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);

  // Word-by-Word Interlinear & Strong's Lexicon state
  const [interlinearWords, setInterlinearWords] = useState<InterlinearWord[]>(
    []
  );
  const [loadingInterlinear, setLoadingInterlinear] = useState(false);
  const [selectedWord, setSelectedWord] = useState<InterlinearWord | null>(
    null
  );
  const [wordLexicon, setWordLexicon] = useState<LexiconEntry | null>(null);
  const [loadingLexicon, setLoadingLexicon] = useState(false);
  const [speakingWord, setSpeakingWord] = useState(false);

  // Monotonic request IDs + AbortControllers prevent stale async responses from overwriting newer selections
  const chapterReqIdRef = useRef(0);
  const chapterAbortRef = useRef<AbortController | null>(null);
  const verseReqIdRef = useRef(0);
  const verseAbortRef = useRef<AbortController | null>(null);
  const lexiconReqIdRef = useRef(0);

  // Cross-link saved sermons/studies referencing this chapter & map to specific verses!
  const { relatedNotes, verseStudyMap } = React.useMemo(() => {
    const matched: { note: StudyNote; verse?: number; reference: string }[] = [];
    const byVerse = new Map<number, StudyNote[]>();

    for (const n of notes) {
      for (const ref of n.scriptureReferences || []) {
        const parsed = parseScriptureReference(ref.reference);
        if (parsed && parsed.book === book && parsed.chapter === chapter) {
          if (!matched.some((m) => m.note.id === n.id)) {
            matched.push({ note: n, verse: parsed.verse, reference: ref.reference });
          }
          const targetVerse = parsed.verse ?? 1;
          const existing = byVerse.get(targetVerse) || [];
          if (!existing.some((item) => item.id === n.id)) {
            byVerse.set(targetVerse, [...existing, n]);
          }
        }
      }
    }
    return { relatedNotes: matched, verseStudyMap: byVerse };
  }, [notes, book, chapter]);

  const chapterHasNotes = React.useMemo(() => {
    return Object.values(highlights).some(
      (h) => h.book === book && h.chapter === chapter && Boolean(h.note)
    );
  }, [highlights, book, chapter]);

  // Sync external navigation (from Library, Scanner, or Full Screen expansion)
  useEffect(() => {
    setBook(initialBook);
    setChapter(initialChapter);
    setActiveHighlight(highlightVerse);
    if (initialTranslation) {
      setTranslation(initialTranslation);
    }
  }, [initialBook, initialChapter, initialTranslation, highlightVerse]);

  useEffect(() => {
    if (!initialTranslation && settings.defaultTranslation) {
      setTranslation(settings.defaultTranslation);
    }
  }, [settings.defaultTranslation, initialTranslation]);

  const closeVerseDrawer = useCallback(() => {
    verseReqIdRef.current += 1;
    verseAbortRef.current?.abort();
    verseAbortRef.current = null;
    setSelectedVerse(null);
    setSheetMinimized(false);
    setSheetDragY(0);
    setIsDraggingSheet(false);
    setShareOpen(false);
    setLoadingInsight(false);
    setLoadingInterlinear(false);
  }, []);

  useEffect(() => {
    return () => {
      chapterAbortRef.current?.abort();
      verseAbortRef.current?.abort();
    };
  }, []);

  const currentBookObj =
    BIBLE_BOOKS.find((b) => b.name === book) || BIBLE_BOOKS[42]; // John

  const loadChapter = useCallback(
    async (b: string, ch: number, trans: string) => {
      const reqId = ++chapterReqIdRef.current;
      chapterAbortRef.current?.abort();
      const controller = new AbortController();
      chapterAbortRef.current = controller;

      setLoadingChapter(true);
      setChapterError(null);
      try {
        const res = await fetch(
          `/api/bible?passage=${encodeURIComponent(
            `${b} ${ch}`
          )}&translation=${encodeURIComponent(trans)}`,
          {
            headers: bibleHeaders(settings),
            signal: controller.signal,
          }
        );
        const data = (await res.json()) as BibleChapterResponse & { error?: string };
        if (reqId !== chapterReqIdRef.current) return;
        if (!res.ok) {
          throw new Error(data.error || "Could not load Bible chapter.");
        }
        setChapterData(data);
      } catch (err) {
        if (reqId !== chapterReqIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setChapterError(
          err instanceof Error ? err.message : "Failed to fetch scripture."
        );
      } finally {
        if (reqId === chapterReqIdRef.current) {
          setLoadingChapter(false);
        }
      }
    },
    [settings.esvApiKey]
  );

  useEffect(() => {
    closeVerseDrawer();
    loadChapter(book, chapter, translation);
  }, [book, chapter, translation, loadChapter, closeVerseDrawer]);

  // Lock background scroll on mobile only while the Verse Study sheet is expanded (unlock when minimized)
  useEffect(() => {
    if (!selectedVerse) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !shareOpen) {
        closeVerseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const isMobileModal = window.innerWidth < 1024 && !sheetMinimized;
    const prevOverflow = document.body.style.overflow;
    if (isMobileModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (isMobileModal) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [selectedVerse, sheetMinimized, shareOpen, closeVerseDrawer]);

  const handleSheetCollapseStart = (
    e: React.TouchEvent,
    fromScrollBody = false
  ) => {
    if (window.innerWidth >= 1024) return;
    if (
      fromScrollBody &&
      sheetScrollRef.current &&
      sheetScrollRef.current.scrollTop > 4
    ) {
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    sheetTouchRef.current = {
      startY: touch.clientY,
      startTime: Date.now(),
      mode: "collapse",
      fromScrollBody,
      engaged: !fromScrollBody,
    };
    if (!fromScrollBody) {
      setIsDraggingSheet(true);
    }
  };

  const handleSheetCollapseMove = (e: React.TouchEvent) => {
    const state = sheetTouchRef.current;
    if (!state || state.mode !== "collapse") return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - state.startY;

    if (state.fromScrollBody && !state.engaged) {
      if (deltaY > 10 && (sheetScrollRef.current?.scrollTop ?? 0) <= 4) {
        state.engaged = true;
        state.startY = touch.clientY;
        setIsDraggingSheet(true);
        return;
      }
      if (deltaY < -6) {
        sheetTouchRef.current = null;
      }
      return;
    }

    if (deltaY > 0) {
      setSheetDragY(deltaY);
    } else {
      setSheetDragY(0);
    }
  };

  const handleSheetCollapseEnd = () => {
    const state = sheetTouchRef.current;
    sheetTouchRef.current = null;
    if (!state || state.mode !== "collapse") return;
    const elapsed = Math.max(Date.now() - state.startTime, 1);
    const velocity = sheetDragY / elapsed;
    const shouldMinimize =
      sheetDragY > 65 || (sheetDragY > 24 && velocity > 0.32);
    setIsDraggingSheet(false);
    setSheetDragY(0);
    if (shouldMinimize) {
      setSheetMinimized(true);
    }
  };

  const handleMinimizedTabTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    sheetTouchRef.current = {
      startY: touch.clientY,
      startTime: Date.now(),
      mode: "expand",
      engaged: true,
    };
    setIsDraggingSheet(true);
  };

  const handleMinimizedTabTouchMove = (e: React.TouchEvent) => {
    const state = sheetTouchRef.current;
    if (!state || state.mode !== "expand") return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - state.startY;
    if (deltaY < 0) {
      setSheetDragY(Math.max(deltaY, -120));
    } else {
      setSheetDragY(Math.min(deltaY * 0.25, 16));
    }
  };

  const handleMinimizedTabTouchEnd = () => {
    const state = sheetTouchRef.current;
    sheetTouchRef.current = null;
    if (!state || state.mode !== "expand") return;
    const elapsed = Math.max(Date.now() - state.startTime, 1);
    const upwardDist = -sheetDragY;
    const velocity = upwardDist / elapsed;
    const shouldExpand =
      upwardDist > 26 || (upwardDist > 12 && velocity > 0.22);
    setIsDraggingSheet(false);
    setSheetDragY(0);
    if (shouldExpand) {
      setSheetMinimized(false);
    }
  };

  // Auto-scroll highlighted verse into view (only in full-screen reader so embedded home view stays at top)
  useEffect(() => {
    if (embedded || !activeHighlight || !chapterData) return;
    const el = document.getElementById(`verse-${activeHighlight}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [embedded, activeHighlight, chapterData]);

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

  const speakWord = (word: InterlinearWord) => {
    pronounceWord({
      text: word.text || word.transliteration,
      fallbackText: word.transliteration || word.gloss,
      language: word.language,
      strongs: word.strongs,
      onStart: () => setSpeakingWord(true),
      onEnd: () => setSpeakingWord(false),
    });
  };

  const handleSelectInterlinearWord = async (word: InterlinearWord) => {
    const reqId = ++lexiconReqIdRef.current;
    setSelectedWord(word);
    setWordLexicon(null);
    if (!word.strongs) {
      setLoadingLexicon(false);
      return;
    }
    setLoadingLexicon(true);
    try {
      const res = await fetch(
        `/api/lexicon?q=${encodeURIComponent(word.strongs)}`
      );
      if (reqId !== lexiconReqIdRef.current) return;
      if (res.ok) {
        const data = (await res.json()) as { entries?: LexiconEntry[] };
        if (reqId === lexiconReqIdRef.current) {
          setWordLexicon(data.entries?.[0] || null);
        }
      }
    } finally {
      if (reqId === lexiconReqIdRef.current) {
        setLoadingLexicon(false);
      }
    }
  };

  const handleVerseClick = async (v: BibleVerse) => {
    const reqId = ++verseReqIdRef.current;
    verseAbortRef.current?.abort();
    const controller = new AbortController();
    verseAbortRef.current = controller;

    const loadedTranslation = (
      chapterData?.translation_id || translation
    ).toLowerCase();

    setSelectedVerse(v);
    setSheetMinimized(false);
    setSheetDragY(0);
    setIsDraggingSheet(false);
    setSelectedVerseTranslation(loadedTranslation);
    const vKey = `${v.book_name}:${v.chapter}:${v.verse}`;
    setMarginNoteDraft(highlights[vKey]?.note || "");
    setInsight(null);
    setInsightError(null);
    setSavedVerseSuccess(false);
    setLoadingInsight(true);
    setInterlinearWords([]);
    setSelectedWord(null);
    setWordLexicon(null);
    setLoadingInterlinear(true);

    const ref = `${v.book_name} ${v.chapter}:${v.verse}`;
    const surrounding = (chapterData?.verses || [])
      .filter((item) => Math.abs(item.verse - v.verse) <= 2)
      .map((item) => `${item.verse}. ${item.text.trim()}`)
      .join(" ");

    // Fetch real word-by-word Hebrew/Greek interlinear in parallel with AI insight!
    fetch(`/api/interlinear?passage=${encodeURIComponent(ref)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ words?: InterlinearWord[] }>) : null))
      .then((data) => {
        if (reqId !== verseReqIdRef.current) return;
        if (Array.isArray(data?.words)) {
          setInterlinearWords(data.words);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (reqId === verseReqIdRef.current) {
          setLoadingInterlinear(false);
        }
      });

    try {
      const res = await fetch("/api/ai/verse-insight", {
        method: "POST",
        headers: aiHeaders(settings),
        signal: controller.signal,
        body: JSON.stringify({
          reference: ref,
          verseText: v.text.trim(),
          translation: loadedTranslation.toUpperCase(),
          surroundingContext: surrounding,
        }),
      });
      const data = (await res.json()) as {
        insight?: VerseInsight;
        error?: string;
      };
      if (reqId !== verseReqIdRef.current) return;
      if (!res.ok || !data.insight) {
        throw new Error(data.error || "Could not load verse insight.");
      }
      setInsight(data.insight);
    } catch (err) {
      if (reqId !== verseReqIdRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setInsightError(
        err instanceof Error ? err.message : "Failed to load insight."
      );
    } finally {
      if (reqId === verseReqIdRef.current) {
        setLoadingInsight(false);
      }
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
    <div className={embedded ? "w-full min-w-0 max-w-5xl mx-auto" : "w-full min-w-0 max-w-6xl mx-auto pb-16"}>
      {/* Top Reader Toolbar */}
      <div
        className={
          embedded
            ? "mb-4 pb-3 border-b border-[#E6DCCB] dark:border-[#2A2520]"
            : "sticky top-0 z-20 -mx-3.5 sm:-mx-4 px-3.5 sm:px-4 py-3 bg-[#FAF7F2]/95 dark:bg-[#141210]/95 backdrop-blur-md border-b border-[#E6DCCB] dark:border-[#2A2520] mb-6"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Book / Chapter Selector */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={handlePrevChapter}
              className="p-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition shrink-0"
              title="Previous chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#DFD5C5] dark:border-[#36302A] hover:border-[#B88435] font-serif text-sm sm:text-base font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition truncate"
            >
              <BookOpen className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164] shrink-0" />
              <span className="truncate">{book} {chapter}</span>
            </button>

            <button
              onClick={handleNextChapter}
              className="p-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition shrink-0"
              title="Next chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Jump + Translation */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
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
              className="px-2.5 sm:px-3 py-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FDFCFA] dark:bg-[#1D1A17] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            >
              {BIBLE_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short}
                </option>
              ))}
            </select>

            {embedded && onExpandFullScreen && (
              <button
                onClick={() =>
                  onExpandFullScreen({
                    book,
                    chapter,
                    verse: selectedVerse?.verse ?? activeHighlight,
                    translation,
                  })
                }
                className="px-2.5 sm:px-3 py-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FDFCFA] dark:bg-[#1D1A17] hover:border-[#B88435] text-xs font-medium whitespace-nowrap transition"
              >
                Full Screen
              </button>
            )}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* Scripture Column */}
        <div
          className={`min-w-0 w-full ${
            selectedVerse ? "lg:col-span-7" : "lg:col-span-10 lg:col-start-2"
          } rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 sm:p-8 lg:p-10 shadow-sm transition-all overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#EFE8DC] dark:border-[#2A2520]">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold">
                {book} {chapter}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B635B] dark:text-[#A39A90] mt-1">
                <span>
                  {chapterData?.translation_name || translation.toUpperCase()} · Tap any verse to highlight, add notes, or study
                </span>
                {(chapterHasNotes || verseStudyMap.size > 0) && (
                  <span className="inline-flex items-center gap-2.5 text-[11px] font-medium">
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      Note
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <Bookmark className="w-3 h-3 fill-emerald-500/80 text-emerald-600 dark:text-emerald-400" />
                      Study
                    </span>
                  </span>
                )}
              </div>
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
            <div className="space-y-1.5 font-serif text-[19px] leading-[1.9] text-[#24201C] dark:text-[#ECE5DA]">
              {chapterData?.verses.map((v) => {
                const isSelected = selectedVerse?.verse === v.verse;
                const isHighlighted = activeHighlight === v.verse;
                const vKey = `${v.book_name}:${v.chapter}:${v.verse}`;
                const savedHl = highlights[vKey];
                const hasNote = Boolean(savedHl?.note);
                const verseStudies = verseStudyMap.get(v.verse) || [];
                return (
                  <button
                    key={v.verse}
                    id={`verse-${v.verse}`}
                    onClick={() => handleVerseClick(v)}
                    className={`w-full text-left px-2 sm:px-2.5 py-1.5 rounded-xl transition block group ${
                      isSelected
                        ? "border-l-2 border-[#9A6B24] bg-[#FAF4E8]/70 dark:bg-[#251E15]/60 pl-3"
                        : "hover:bg-[#FAF5EB]/70 dark:hover:bg-[#25211C]/60"
                    }`}
                  >
                    <sup className="font-sans text-xs font-bold text-[#9A6B24] dark:text-[#DFB164] mr-1.5 select-none inline-flex items-center gap-0.5 align-super">
                      <span>{v.verse}</span>
                      {hasNote && (
                        <span title={`Personal note: ${savedHl?.note}`}>
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 inline" />
                        </span>
                      )}
                      {verseStudies.length > 0 && (
                        <span
                          title={`Saved study: ${verseStudies
                            .map((s) => s.title)
                            .join(", ")}`}
                        >
                          <Bookmark className="w-2.5 h-2.5 fill-emerald-500/85 text-emerald-600 dark:text-emerald-400 inline" />
                        </span>
                      )}
                    </sup>
                    <span
                      className={
                        savedHl
                          ? HIGHLIGHT_STYLES[savedHl.color].bg
                          : isHighlighted
                          ? "bg-[#F7EAD0]/75 dark:bg-[#3A2D1B]/65 decoration-clone rounded px-1 py-0.5"
                          : isSelected
                          ? "underline decoration-[#B88435]/50 decoration-dotted underline-offset-4"
                          : ""
                      }
                    >
                      {v.text.trim()}
                    </span>
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

        {/* Contextual Verse Insight Drawer (Swipeable bottom sheet on phone/tablet, sticky side panel on desktop) */}
        {selectedVerse && (
          <div
            role="dialog"
            aria-modal={!sheetMinimized}
            aria-label={`Verse study for ${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSheetMinimized(true);
            }}
            className={`${
              sheetMinimized
                ? "hidden lg:block"
                : "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:block lg:p-0"
            } lg:col-span-5 lg:sticky lg:top-20`}
          >
            <aside
              style={
                !sheetMinimized && sheetDragY > 0
                  ? { transform: `translateY(${sheetDragY}px)` }
                  : undefined
              }
              className={`w-full max-h-[88dvh] sm:max-w-lg lg:max-w-none lg:max-h-none flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border-t sm:border border-[#DFC9A3] dark:border-[#4A3A22] shadow-2xl lg:shadow-lg overflow-hidden ${
                isDraggingSheet ? "" : "transition-transform duration-200 ease-out"
              }`}
            >
              {/* Mobile swipe-down drag handle + header zone */}
              <div
                onTouchStart={(e) => handleSheetCollapseStart(e, false)}
                onTouchMove={handleSheetCollapseMove}
                onTouchEnd={handleSheetCollapseEnd}
                onTouchCancel={handleSheetCollapseEnd}
                className="touch-none lg:touch-auto bg-[#FAF4E8] dark:bg-[#251E15] border-b border-[#E9D7B6] dark:border-[#3C301E] shrink-0 select-none lg:select-auto"
              >
                <div className="lg:hidden pt-2.5 pb-1 flex flex-col items-center gap-1">
                  <span className="w-12 h-1.5 rounded-full bg-[#D1B88E] dark:bg-[#5A472B]" />
                  <span className="text-[10px] font-medium text-[#8C7B63] dark:text-[#A39178]">
                    Swipe down to hide · X to close
                  </span>
                </div>

                <div className="px-5 pb-3.5 pt-1 lg:py-4 flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Lamp Verse Study
                      {loadingInsight && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#F7EAD0] dark:bg-[#3A2D1B] px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-[#7B531A] dark:text-[#DFB164]">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Loading AI
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-xl font-semibold mt-0.5">
                      {selectedVerse.book_name} {selectedVerse.chapter}:
                      {selectedVerse.verse}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      title="Share Scripture Card"
                      className="px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-black/25 border border-[#DFC9A3] dark:border-[#4A3A22] hover:border-[#9A6B24] text-xs font-semibold text-[#7B531A] dark:text-[#DFB164] inline-flex items-center gap-1.5 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={closeVerseDrawer}
                      aria-label="Close verse study"
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4-Tab Bible Word Study Action Bar */}
              <div className="grid grid-cols-4 border-b border-[#EFE8DC] dark:border-[#2A2520] bg-[#FAF7F2] dark:bg-[#171411] text-[11px] font-semibold shrink-0">
                {(
                  [
                    { id: "explain", label: "Explain" },
                    { id: "original", label: "Original" },
                    { id: "deep", label: "Deep Study" },
                    { id: "related", label: "Related" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id)}
                    className={`py-2.5 text-center border-b-2 transition ${
                      drawerTab === tab.id
                        ? "border-[#9A6B24] text-[#9A6B24] dark:text-[#DFB164] bg-[#FDFCFA] dark:bg-[#1D1A17]"
                        : "border-transparent text-[#6B635B] dark:text-[#A39A90] hover:text-[#1C1917] dark:hover:text-[#F5F0E8]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div
                ref={sheetScrollRef}
                onTouchStart={(e) => handleSheetCollapseStart(e, true)}
                onTouchMove={handleSheetCollapseMove}
                onTouchEnd={handleSheetCollapseEnd}
                onTouchCancel={handleSheetCollapseEnd}
                className="p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain lg:max-h-[75vh] space-y-5"
              >
                <blockquote className="font-serif italic text-sm sm:text-base leading-relaxed pl-3.5 border-l-2 border-[#B88435] text-[#3F3A35] dark:text-[#DED6CB]">
                &ldquo;{selectedVerse.text.trim()}&rdquo;
              </blockquote>

              {/* Linked Studies on this specific verse */}
              {(verseStudyMap.get(selectedVerse.verse) || []).length > 0 && (
                <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/70 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Bookmark className="w-3 h-3 fill-emerald-500/80" />
                    Saved Studies on This Verse
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(verseStudyMap.get(selectedVerse.verse) || []).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onOpenLibraryNote(st.id)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1D1A17] border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-900 dark:text-emerald-200 hover:underline"
                      >
                        {st.title} →
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              {/* TAB 2: Original Language Word-by-Word Interlinear (Zero AI Wait!) */}
              {drawerTab === "original" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5" />
                      Word-by-Word Interlinear (Tap any word)
                    </h3>
                  </div>

                  {loadingInterlinear ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-xs text-[#6B635B]">
                      <Loader2 className="w-5 h-5 animate-spin text-[#9A6B24]" />
                      <span>Loading original Hebrew/Greek text...</span>
                    </div>
                  ) : interlinearWords.length === 0 ? (
                    <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                      Word-by-word interlinear is unavailable for this verse.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {interlinearWords.map((w) => {
                        const active =
                          selectedWord?.pos === w.pos &&
                          selectedWord?.strongs === w.strongs;
                        return (
                          <button
                            key={w.pos}
                            type="button"
                            onClick={() => handleSelectInterlinearWord(w)}
                            className={`text-left px-3 py-2 rounded-xl border transition ${
                              active
                                ? "border-[#9A6B24] bg-[#F7EAD0]/80 dark:bg-[#3A2D1B]"
                                : "border-[#E6DCCB] dark:border-[#2F2A24] bg-[#FAF7F2] dark:bg-[#141210] hover:border-[#B88435]"
                            }`}
                          >
                            <span className="block font-serif text-base font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
                              {w.text}
                            </span>
                            <span className="block text-[11px] italic text-[#9A6B24] dark:text-[#DFB164]">
                              {w.transliteration}
                            </span>
                            <span className="block text-[11px] text-[#574F47] dark:text-[#C9BFB3] mt-0.5">
                              {w.gloss}
                            </span>
                            {w.strongs && (
                              <span className="block font-mono text-[10px] text-[#8C8278] mt-0.5">
                                {w.strongs}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Word Strong's Lexicon Panel */}
                  {selectedWord && (
                    <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#DFC9A3] dark:border-[#4A3A22] p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-semibold">
                              {selectedWord.text}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#F7EAD0] dark:bg-[#3A2D1B] text-[#7B531A] dark:text-[#DFB164] font-mono text-[11px] font-bold">
                              {selectedWord.strongs}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-0.5">
                            {selectedWord.transliteration} · {selectedWord.parsingFull || selectedWord.parsing}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakWord(selectedWord)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition ${
                            speakingWord
                              ? "bg-[#F7EAD0] dark:bg-[#3A2D1B] border-[#9A6B24] text-[#7B531A] dark:text-[#DFB164]"
                              : "bg-white dark:bg-[#1D1A17] border-[#E6DCCB] dark:border-[#322C26] hover:border-[#9A6B24]"
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164] ${speakingWord ? "animate-pulse" : ""}`} />
                          {speakingWord ? "Playing..." : "Hear"}
                        </button>
                      </div>

                      {loadingLexicon ? (
                        <div className="py-3 flex items-center gap-2 text-xs text-[#6B635B]">
                          <Loader2 className="w-4 h-4 animate-spin text-[#9A6B24]" />
                          Loading Strong&apos;s / BDB / Thayer&apos;s lexicon...
                        </div>
                      ) : wordLexicon ? (
                        <div className="text-xs leading-relaxed text-[#3F3A35] dark:text-[#D1C9BE] space-y-1 max-h-52 overflow-y-auto pt-1 border-t border-[#E6DCCB] dark:border-[#2F2A24]">
                          {wordLexicon.pronunciation && (
                            <p className="text-[11px] text-[#9A6B24] dark:text-[#DFB164]">
                              Pronunciation: {wordLexicon.pronunciation}
                            </p>
                          )}
                          {wordLexicon.definitionLines.slice(0, 14).map((l, i) => (
                            <p key={i}>{l}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#6B635B]">
                          Gloss: {selectedWord.gloss}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {drawerTab !== "original" && loadingInsight && (
                <div className="rounded-2xl bg-[#FAF4E8]/80 dark:bg-[#251E15]/80 border border-[#E9D7B6] dark:border-[#3C301E] py-8 px-4 flex flex-col items-center text-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-11 h-11 rounded-full bg-[#DFB164]/20 animate-ping" />
                    <div className="relative w-10 h-10 rounded-full bg-[#F7EAD0] dark:bg-[#3A2D1B] flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-[#9A6B24] dark:text-[#DFB164]" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
                      Preparing verse study...
                    </p>
                    <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                      Researching historical context, original languages &amp; application
                    </p>
                  </div>
                </div>
              )}

              {drawerTab !== "original" && insightError && (
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
                  {/* TAB 1: Explain */}
                  {drawerTab === "explain" && (
                    <div className="space-y-4 text-sm leading-relaxed">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-1">
                          <Layers className="w-3.5 h-3.5" />
                          Plain-Language Meaning
                        </h3>
                        <p className="text-[#3F3A35] dark:text-[#D5CDC2]">
                          {insight.deeperMeaning}
                        </p>
                      </div>

                      {insight.lifeApplication.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-1.5">
                            <HeartHandshake className="w-3.5 h-3.5" />
                            Living It Out Today
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
                  )}

                  {/* TAB 3: Deep Study */}
                  {drawerTab === "deep" && (
                    <div className="space-y-4 text-sm leading-relaxed">
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
                        {insight.literaryContext && (
                          <p className="mt-1.5 text-xs text-[#6B635B] dark:text-[#A39A90]">
                            <strong>Literary Context:</strong> {insight.literaryContext}
                          </p>
                        )}
                      </div>

                      {insight.keyWordStudy.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5 mb-2">
                            <Languages className="w-3.5 h-3.5" />
                            Key Theological Terms
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
                    </div>
                  )}

                  {/* TAB 4: Related Verses + Ask Lamp */}
                  {drawerTab === "related" && (
                    <div className="space-y-4">
                      {insight.crossReferences.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-1.5">
                            Connected Cross-References (Tap to Jump)
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

                      <AskVesselChat
                        settings={settings}
                        compact
                        contextType="bible"
                        contextTitle={`${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`}
                        contextBody={`Verse (${selectedVerseTranslation.toUpperCase()}): "${selectedVerse.text.trim()}"\nHistorical Context: ${insight.historicalContext}\nDeeper Meaning: ${insight.deeperMeaning}`}
                        suggestions={[
                          "How does this connect to Jesus?",
                          "Give a real-life example of living this out",
                        ]}
                      />
                    </div>
                  )}

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
                </>
              )}
              </div>

              {/* Compact Mobile Bottom Tab to tuck modal away & jump back to Bible Reader */}
              <div
                onTouchStart={(e) => handleSheetCollapseStart(e, false)}
                onTouchMove={handleSheetCollapseMove}
                onTouchEnd={handleSheetCollapseEnd}
                onTouchCancel={handleSheetCollapseEnd}
                className="lg:hidden touch-none shrink-0 border-t border-[#E9D7B6] dark:border-[#3C301E] bg-[#FAF4E8]/95 dark:bg-[#251E15]/95 px-4 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] flex items-center justify-center"
              >
                <button
                  type="button"
                  onClick={() => setSheetMinimized(true)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-[#1A1612] border border-[#DFC9A3] dark:border-[#4A3A22] text-xs font-semibold text-[#7B531A] dark:text-[#DFB164] shadow-sm active:scale-95 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Back to Bible Reader
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Minimized Floating Mobile Tab — Swipe Up or Tap to Reopen Verse Study */}
      {selectedVerse && sheetMinimized && (
        <div
          onTouchStart={handleMinimizedTabTouchStart}
          onTouchMove={handleMinimizedTabTouchMove}
          onTouchEnd={handleMinimizedTabTouchEnd}
          onTouchCancel={handleMinimizedTabTouchEnd}
          style={
            sheetDragY !== 0
              ? { transform: `translateY(${sheetDragY}px)` }
              : undefined
          }
          className={`lg:hidden touch-none fixed left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-40 ${
            isDraggingSheet ? "" : "transition-transform duration-200 ease-out"
          }`}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSheetMinimized(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSheetMinimized(false);
              }
            }}
            className="w-full rounded-2xl bg-[#1C1917]/95 dark:bg-[#251E15]/95 text-[#FAF7F2] border border-[#B88435]/60 shadow-xl backdrop-blur-md px-3.5 pt-1.5 pb-2.5 cursor-pointer select-none"
          >
            <div className="flex justify-center mb-1">
              <span className="w-10 h-1 rounded-full bg-[#DFB164]/60" />
            </div>
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-xl bg-[#9A6B24]/30 text-[#DFB164] flex items-center justify-center shrink-0">
                  {loadingInsight ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-[#FAF7F2]">
                    {selectedVerse.book_name} {selectedVerse.chapter}:
                    {selectedVerse.verse} · Verse Study
                  </p>
                  <p className="text-[10px] text-[#D2C5B2] truncate">
                    {loadingInsight
                      ? "AI insight loading… swipe up or tap to view"
                      : "Swipe up or tap to reopen AI study"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-0.5 rounded-lg bg-[#9A6B24] px-2 py-1 text-[10px] font-semibold text-white">
                  <ChevronUp className="w-3 h-3" />
                  Open
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeVerseDrawer();
                  }}
                  aria-label="Close verse study"
                  className="p-1.5 rounded-lg text-[#D2C5B2] hover:bg-white/10 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Scripture Quote Card Modal */}
      {selectedVerse && (
        <ShareVerseModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          reference={`${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`}
          verseText={selectedVerse.text}
          translation={selectedVerseTranslation}
        />
      )}
    </div>
  );
}
