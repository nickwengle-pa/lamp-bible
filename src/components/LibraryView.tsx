"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Mic,
  Youtube,
  Camera,
  BookOpen,
  FileText,
  Pin,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  FolderOpen,
  Languages,
  ChevronRight,
  PlayCircle,
  Flame,
  Library as LibraryIcon,
  PenLine,
} from "lucide-react";
import { AppSettings, NoteSourceType, StudyNote } from "@/lib/types";
import { formatDuration, noteToMarkdown } from "@/lib/client-api";
import { BIBLE_BOOKS, parseScriptureReference } from "@/lib/bible-books";
import {
  DailyVerse,
  getVerseOfTheDayLocal,
  getVerseOfTheDayUTC,
} from "@/lib/verse-of-the-day";
import { plainTextToSafeHtml, sanitizeRichNoteHtml } from "@/lib/rich-text";
import { linkifyScriptureInHtml } from "@/lib/scripture-links";
import AskVesselChat from "./AskVesselChat";
import RichNoteModal from "./RichNoteModal";

interface LibraryViewProps {
  settings: AppSettings;
  notes: StudyNote[];
  loading: boolean;
  selectedNoteId: string | null;
  userName?: string;
  onSelectNote: (id: string | null) => void;
  onUpdateNote: (id: string, updates: Partial<StudyNote>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onOpenScripture: (reference: string) => void;
  onQuickNavigate: (tab: "words" | "record" | "youtube" | "bible" | "scan") => void;
  onOpenGuide?: () => void;
}

const SOURCE_META: Record<
  NoteSourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string }
> = {
  sermon: {
    label: "Live Sermon",
    icon: Mic,
    badgeClass:
      "bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    badgeClass: "bg-rose-100/80 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  },
  scan: {
    label: "Scanned Page",
    icon: Camera,
    badgeClass:
      "bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  verse: {
    label: "Verse Study",
    icon: BookOpen,
    badgeClass:
      "bg-indigo-100/80 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
  },
  manual: {
    label: "Study Note",
    icon: FileText,
    badgeClass:
      "bg-stone-200/80 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
  },
};

type LibrarySection =
  | "all"
  | "word"
  | "verse"
  | "sermon"
  | "youtube"
  | "scan"
  | "manual";

function isWordStudyNote(note: StudyNote): boolean {
  return (
    Boolean(note.series?.toLowerCase().includes("word")) ||
    note.tags.some((t) => t.toLowerCase().includes("word study")) ||
    note.title.toLowerCase().startsWith("word study")
  );
}

function matchesLibrarySection(note: StudyNote, section: LibrarySection): boolean {
  if (section === "all") return true;
  if (section === "word") return isWordStudyNote(note);
  if (section === "verse") return note.sourceType === "verse" && !isWordStudyNote(note);
  return note.sourceType === section;
}

const SECTION_TABS: {
  id: LibrarySection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "All", shortLabel: "All", icon: FolderOpen },
  { id: "word", label: "Word Study", shortLabel: "Word", icon: Languages },
  { id: "verse", label: "Verse Study", shortLabel: "Verse", icon: BookOpen },
  { id: "sermon", label: "Sermon", shortLabel: "Sermon", icon: Mic },
  { id: "youtube", label: "YouTube", shortLabel: "YouTube", icon: Youtube },
  { id: "scan", label: "Scan", shortLabel: "Scan", icon: Camera },
  { id: "manual", label: "Guides & Notes", shortLabel: "Guides", icon: FileText },
];

export default function LibraryView({
  settings,
  notes,
  loading,
  selectedNoteId,
  userName,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onOpenScripture,
  onQuickNavigate,
  onOpenGuide,
}: LibraryViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LibrarySection>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [libraryDrawerOpen, setLibraryDrawerOpen] = useState(false);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse>(() =>
    getVerseOfTheDayUTC()
  );

  useEffect(() => {
    setDailyVerse(getVerseOfTheDayLocal());
  }, []);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);
  const [jumpBook, setJumpBook] = useState("John");
  const [jumpChapter, setJumpChapter] = useState(1);
  const [jumpVerse, setJumpVerse] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedJumpBookObj = useMemo(
    () => BIBLE_BOOKS.find((b) => b.name === jumpBook) || BIBLE_BOOKS[42],
    [jumpBook]
  );

  const parsedSearchRef = useMemo(
    () => (search.trim() ? parseScriptureReference(search) : null),
    [search]
  );

  const buildJumpReference = () => {
    const v = parseInt(jumpVerse.trim(), 10);
    return Number.isFinite(v) && v > 0
      ? `${jumpBook} ${jumpChapter}:${v}`
      : `${jumpBook} ${jumpChapter}`;
  };
  const [showTranscript, setShowTranscript] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [seriesDraft, setSeriesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const allSeries = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.series?.trim()) set.add(n.series.trim());
    });
    return Array.from(set).sort();
  }, [notes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  React.useEffect(() => {
    if (selectedNote) {
      setSeriesDraft(selectedNote.series || "");
      setShowTranscript(false);
      setJournalModalOpen(false);
    }
  }, [selectedNote?.id]);

  const sectionCounts = useMemo(() => {
    const counts: Record<LibrarySection, number> = {
      all: notes.length,
      word: 0,
      verse: 0,
      sermon: 0,
      youtube: 0,
      scan: 0,
      manual: 0,
    };
    for (const n of notes) {
      if (isWordStudyNote(n)) counts.word += 1;
      else if (n.sourceType === "verse") counts.verse += 1;
      else if (n.sourceType === "sermon") counts.sermon += 1;
      else if (n.sourceType === "youtube") counts.youtube += 1;
      else if (n.sourceType === "scan") counts.scan += 1;
      else counts.manual += 1;
    }
    return counts;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (!matchesLibrarySection(note, filter)) return false;
      if (seriesFilter !== "all" && (note.series || "") !== seriesFilter)
        return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.summary.toLowerCase().includes(q) ||
        (note.speaker || "").toLowerCase().includes(q) ||
        (note.series || "").toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q)) ||
        note.scriptureReferences.some((r) => r.reference.toLowerCase().includes(q)) ||
        note.personalNotes.toLowerCase().includes(q)
      );
    });
  }, [notes, filter, seriesFilter, search]);

  const handleCopyMarkdown = async (note: StudyNote) => {
    await navigator.clipboard.writeText(noteToMarkdown(note));
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleTakeaway = async (note: StudyNote, takeawayId: string) => {
    const next = note.actionableTakeaways.map((t) =>
      t.id === takeawayId ? { ...t, completed: !t.completed } : t
    );
    await onUpdateNote(note.id, { actionableTakeaways: next });
  };

  const handleSaveRichJournal = async (plainText: string, html: string) => {
    if (!selectedNote) return;
    setSavingNotes(true);
    try {
      await onUpdateNote(selectedNote.id, {
        personalNotes: plainText,
        personalNotesHtml: html,
      });
      setJournalModalOpen(false);
    } finally {
      setSavingNotes(false);
    }
  };

  // Detail View when a note is opened
  if (selectedNote) {
    const meta = SOURCE_META[selectedNote.sourceType] || SOURCE_META.manual;
    const SourceIcon = meta.icon;

    return (
      <div className="max-w-4xl mx-auto pb-16">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => onSelectNote(null)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B635B] dark:text-[#A39A90] hover:text-[#1C1917] dark:hover:text-[#F5F0E8] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onUpdateNote(selectedNote.id, { pinned: !selectedNote.pinned })
              }
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition ${
                selectedNote.pinned
                  ? "border-[#9A6B24] bg-[#F7EAD0]/70 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                  : "border-[#E6DCCB] dark:border-[#322C26] hover:bg-[#F2ECE1] dark:hover:bg-[#25211D]"
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              {selectedNote.pinned ? "Pinned" : "Pin"}
            </button>

            <button
              onClick={() => handleCopyMarkdown(selectedNote)}
              className="px-3 py-1.5 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2ECE1] dark:hover:bg-[#25211D] transition"
            >
              {copiedId === selectedNote.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied MD
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Markdown
                </>
              )}
            </button>

            <button
              onClick={async () => {
                if (window.confirm("Delete this study note permanently?")) {
                  await onDeleteNote(selectedNote.id);
                  onSelectNote(null);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Main Editorial Card */}
        <article className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-[#EFE8DC] dark:border-[#2A2520]">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.badgeClass}`}
              >
                <SourceIcon className="w-3.5 h-3.5" />
                {meta.label}
              </span>
              <span className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                {new Date(selectedNote.createdAt).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {selectedNote.durationSeconds ? (
                <span className="inline-flex items-center gap-1 text-xs text-[#6B635B] dark:text-[#A39A90]">
                  <Clock className="w-3 h-3" />
                  {formatDuration(selectedNote.durationSeconds)}
                </span>
              ) : null}
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-semibold tracking-tight leading-tight text-[#1C1917] dark:text-[#F5F0E8]">
              {selectedNote.title}
            </h1>

            {(selectedNote.speaker || selectedNote.churchOrChannel || selectedNote.sourceUrl) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B635B] dark:text-[#A39A90]">
                {selectedNote.speaker && <span>Speaker: {selectedNote.speaker}</span>}
                {selectedNote.churchOrChannel && (
                  <span>{selectedNote.churchOrChannel}</span>
                )}
                {selectedNote.sourceUrl && (
                  <a
                    href={selectedNote.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#9A6B24] dark:text-[#DFB164] hover:underline"
                  >
                    Watch original
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Series / Folder assignment */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#6B635B] dark:text-[#A39A90]">
                <FolderOpen className="w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164]" />
                <span>Series:</span>
              </div>
              <input
                type="text"
                list="detail-series-list"
                value={seriesDraft}
                onChange={(e) => setSeriesDraft(e.target.value)}
                onBlur={() => {
                  const trimmed = seriesDraft.trim();
                  if (trimmed !== (selectedNote.series || "")) {
                    onUpdateNote(selectedNote.id, {
                      series: trimmed || undefined,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Assign to a series / folder..."
                className="px-2.5 py-1 rounded-lg border border-[#E6DCCB] dark:border-[#322C26] bg-[#FAF7F2] dark:bg-[#141210] text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40 w-52"
              />
              {allSeries.length > 0 && (
                <datalist id="detail-series-list">
                  {allSeries.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
            </div>

            {selectedNote.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedNote.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs bg-[#F2ECE1] dark:bg-[#2A2520] text-[#574F47] dark:text-[#C9BFB3]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Summary */}
            {selectedNote.summary && (
              <section className="rounded-2xl bg-[#FAF7F2] dark:bg-[#171411] border border-[#EBE2D3] dark:border-[#2C2721] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Core Message
                </div>
                <p className="font-serif text-lg leading-relaxed text-[#2C2723] dark:text-[#EAE3D8]">
                  {selectedNote.summary}
                </p>
              </section>
            )}

            {/* Referenced Scripture — Clickable to open in Bible Reader! */}
            {selectedNote.scriptureReferences.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-3">
                  Referenced Scripture (Tap to open in Bible Reader)
                </h2>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {selectedNote.scriptureReferences.map((ref, idx) => (
                    <button
                      key={`${ref.reference}-${idx}`}
                      onClick={() => onOpenScripture(ref.reference)}
                      className="text-left p-3.5 rounded-xl border border-[#E6DCCB] dark:border-[#2F2A24] bg-white dark:bg-[#171411] hover:border-[#B88435] hover:shadow-sm transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-semibold text-[#9A6B24] dark:text-[#DFB164] group-hover:underline">
                          {ref.reference}
                        </span>
                        <BookOpen className="w-4 h-4 text-[#B88435]/70 group-hover:text-[#9A6B24]" />
                      </div>
                      {ref.context && (
                        <p className="mt-1 text-xs text-[#6B635B] dark:text-[#A39A90] leading-relaxed">
                          {ref.context}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Key Themes */}
            {selectedNote.keyThemes.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-3">
                  Key Themes
                </h2>
                <div className="flex flex-wrap gap-2">
                  {selectedNote.keyThemes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F7EAD0]/55 dark:bg-[#33281A] border border-[#E6D1A9] dark:border-[#4B3A23] text-sm text-[#5F4114] dark:text-[#E8C98F]"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Structured Outline */}
            {selectedNote.outline.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-4">
                  Structured Study Notes
                </h2>
                <div className="space-y-5">
                  {selectedNote.outline.map((sec, idx) => (
                    <div
                      key={idx}
                      className="pl-4 border-l-2 border-[#D9BC89] dark:border-[#6A4F25]"
                    >
                      <h3 className="font-serif text-lg font-semibold text-[#1C1917] dark:text-[#F5F0E8] mb-2">
                        {sec.heading}
                      </h3>
                      <ul className="space-y-2">
                        {sec.points.map((pt, pIdx) => (
                          <li
                            key={pIdx}
                            className="text-sm leading-relaxed text-[#3F3A35] dark:text-[#D1C9BE] flex gap-2.5"
                          >
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B88435] shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Actionable Takeaways */}
            {selectedNote.actionableTakeaways.length > 0 && (
              <section className="rounded-2xl bg-[#F7EAD0]/30 dark:bg-[#241E16] border border-[#E9D7B6] dark:border-[#3D3122] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-3">
                  Actionable Takeaways
                </h2>
                <div className="space-y-2.5">
                  {selectedNote.actionableTakeaways.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleToggleTakeaway(selectedNote, item.id)}
                      className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/70 dark:hover:bg-[#1A1612] transition"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-[#9A6B24] shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-sm leading-relaxed ${
                          item.completed
                            ? "line-through text-[#8C8278]"
                            : "text-[#2C2723] dark:text-[#EAE3D8]"
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Reflection Questions */}
            {selectedNote.reflectionQuestions.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-3">
                  Reflection Questions
                </h2>
                <ol className="space-y-2.5 list-decimal list-inside">
                  {selectedNote.reflectionQuestions.map((q, idx) => (
                    <li
                      key={idx}
                      className="font-serif text-base italic text-[#3F3A35] dark:text-[#D8CFC4]"
                    >
                      {q}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Personal Reflections & Rich Journal */}
            <section className="pt-4 border-t border-[#EFE8DC] dark:border-[#2A2520]">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90]">
                  Your Personal Reflections &amp; Journal
                </h2>
                <button
                  type="button"
                  onClick={() => setJournalModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#9A6B24] text-white hover:bg-[#7B531A] inline-flex items-center gap-1.5 transition"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  {selectedNote.personalNotes || selectedNote.personalNotesHtml
                    ? "Edit Note"
                    : "Add Note"}
                </button>
              </div>
              {(() => {
                const rawJournalHtml = selectedNote.personalNotesHtml
                  ? sanitizeRichNoteHtml(selectedNote.personalNotesHtml, 50000)
                  : selectedNote.personalNotes
                  ? plainTextToSafeHtml(selectedNote.personalNotes)
                  : "";
                const journalHtml = rawJournalHtml
                  ? linkifyScriptureInHtml(rawJournalHtml)
                  : "";
                if (journalHtml) {
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        const linkEl = (e.target as HTMLElement).closest<HTMLElement>(
                          "[data-scripture-ref]"
                        );
                        if (linkEl?.dataset.scriptureRef) {
                          e.stopPropagation();
                          e.preventDefault();
                          onOpenScripture(linkEl.dataset.scriptureRef);
                          return;
                        }
                        setJournalModalOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          const linkEl = (e.target as HTMLElement).closest<HTMLElement>(
                            "[data-scripture-ref]"
                          );
                          e.preventDefault();
                          if (linkEl?.dataset.scriptureRef) {
                            e.stopPropagation();
                            onOpenScripture(linkEl.dataset.scriptureRef);
                            return;
                          }
                          setJournalModalOpen(true);
                        }
                      }}
                      className="rounded-2xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FAF7F2] dark:bg-[#141210] hover:border-[#B88435] p-4 transition cursor-pointer"
                    >
                      <div
                        className="lamp-rich-note text-sm text-[#2C2723] dark:text-[#EAE3D8]"
                        dangerouslySetInnerHTML={{ __html: journalHtml }}
                      />
                    </div>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={() => setJournalModalOpen(true)}
                    className="w-full text-left rounded-2xl border border-dashed border-[#D8C5A3] dark:border-[#4A3A22] bg-[#FAF7F2] dark:bg-[#141210] hover:border-[#9A6B24] p-4 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#F7EAD0] dark:bg-[#33281A] text-[#9A6B24] dark:text-[#DFB164] flex items-center justify-center shrink-0">
                        <PenLine className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F0E8]">
                          Write prayers, personal convictions, or study notes...
                        </p>
                        <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-0.5">
                          Opens Note Studio with font styles, colors, highlights &amp; bullets
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })()}
            </section>

            {/* Interactive Ask Vessel Follow-Up Chat */}
            <section className="pt-4 border-t border-[#EFE8DC] dark:border-[#2A2520]">
              <AskVesselChat
                settings={settings}
                contextType="note"
                contextTitle={selectedNote.title}
                contextBody={noteToMarkdown(selectedNote)}
                suggestions={[
                  "Turn this into a 5-day devotional plan",
                  "Explain the key Greek/Hebrew words behind this message",
                  "Give me 3 discussion questions for small group",
                ]}
              />
            </section>

            {/* Collapsible Transcript */}
            {selectedNote.transcript && (
              <section className="pt-2 border-t border-[#EFE8DC] dark:border-[#2A2520]">
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] hover:text-[#1C1917] dark:hover:text-[#F5F0E8]"
                >
                  <span>Full Transcript</span>
                  {showTranscript ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showTranscript && (
                  <div className="mt-2 p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#141210] text-xs leading-relaxed text-[#574F47] dark:text-[#BDB4AA] whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {selectedNote.transcript}
                  </div>
                )}
              </section>
            )}
          </div>
        </article>

        {/* Stacked Rich Note Editor Modal for Personal Reflections & Journal */}
        <RichNoteModal
          open={journalModalOpen}
          onClose={() => setJournalModalOpen(false)}
          title={selectedNote.title}
          subtitle="Personal Reflections & Journal"
          initialPlainText={selectedNote.personalNotes || ""}
          initialHtml={selectedNote.personalNotesHtml}
          saving={savingNotes}
          placeholder="Write prayers, personal convictions, bullet outlines, or follow-up thoughts here..."
          onSave={async ({ plainText, html }) => {
            await handleSaveRichJournal(plainText, html);
          }}
          onClear={async () => {
            await handleSaveRichJournal("", "");
          }}
          onOpenScripture={onOpenScripture}
        />
      </div>
    );
  }

  // Library Index View — Clean Home Launchpad + Collapsible Study Library
  const hasActiveQuery =
    Boolean(search.trim()) || filter !== "all" || seriesFilter !== "all";
  const mobileVisibleNotes =
    mobileExpanded || hasActiveQuery ? filteredNotes : filteredNotes.slice(0, 3);
  const firstName = userName?.trim().split(/\s+/)[0];

  const handleOpenSavedLibrary = () => {
    setLibraryDrawerOpen(true);
    setMobileExpanded(true);
    window.setTimeout(() => {
      document
        .getElementById("lamp-study-library")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <div className="max-w-5xl mx-auto pb-2 sm:pb-5 space-y-4 sm:space-y-6">
      {/* Clean Greeting & Purpose Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F0E8]">
            {firstName ? `Welcome, ${firstName}` : "Welcome to Lamp"}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B635B] dark:text-[#A39A90] mt-0.5">
            Read Scripture, study Greek &amp; Hebrew, or capture sermons in one place.
          </p>
        </div>

        {onOpenGuide && (
          <button
            type="button"
            onClick={onOpenGuide}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#DFC9A3] dark:border-[#4A3A22] bg-[#FAF4E8] dark:bg-[#251E15] text-[#7B531A] dark:text-[#DFB164] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:brightness-95 transition"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
        )}
      </div>

      {/* Asymmetric Lantern Glow Bento Launchpad */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Row 1: Full-Width Read Bible + Verse of the Day Lantern Glow Hero */}
        <button
          type="button"
          onClick={() => onOpenScripture(dailyVerse.reference)}
          className="relative w-full text-left overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 bg-gradient-to-br from-[#211910] via-[#3E2A14] to-[#744D1B] border border-[#DFB164]/50 text-[#FAF7F2] shadow-md hover:shadow-lg hover:border-[#F2CA7E]/75 active:scale-[0.99] transition group"
        >
          {/* Centered top lantern arch halo */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 -top-12 -translate-x-1/2 w-56 h-28 rounded-full bg-[radial-gradient(ellipse,rgba(247,213,138,0.34),transparent_70%)] group-hover:opacity-100 opacity-90 transition"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none select-none font-serif absolute -bottom-3 right-3 text-6xl font-bold text-[#F7D994]/[0.08] leading-none"
          >
            {dailyVerse.shortRef}
          </span>
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#F7D58A]/18 border border-[#F7D58A]/40 text-[#F7D994] flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F2CA7E]">
                  <Flame className="w-3 h-3 fill-[#F2CA7E]/80 shrink-0" />
                  <span className="truncate">
                    Verse of the Day · {dailyVerse.reference}
                  </span>
                </div>
                <p className="font-serif text-base sm:text-lg font-semibold leading-tight text-[#FAF7F2] mt-0.5">
                  Read Bible
                </p>
                <p className="font-serif italic text-[11px] sm:text-xs text-[#EFE4CE]/90 line-clamp-2 mt-0.5 leading-snug">
                  &ldquo;{dailyVerse.text}&rdquo;
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-[#FAF7F2]/14 border border-[#F7D58A]/35 text-[#FAE2AE] text-xs font-semibold shrink-0 group-hover:bg-[#FAF7F2]/22 transition inline-flex items-center gap-1">
              Read
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Row 2: Asymmetric Middle — Tall Word & Guides (Left) + Stacked Capture Tools (Right) */}
        <div className="grid grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          {/* Tall Showcase: Word & Guides */}
          <button
            type="button"
            onClick={() => onQuickNavigate("words")}
            className="col-span-6 relative text-left overflow-hidden rounded-2xl p-3 sm:p-4 flex flex-col justify-between bg-gradient-to-br from-[#F4F3FF] to-[#E4E1FF] dark:from-[#231E38] dark:to-[#161323] border border-[#D2CCFA] dark:border-[#3D3566] hover:border-[#6366F1]/70 dark:hover:border-[#818CF8]/70 shadow-sm active:scale-[0.985] transition group"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-8 -top-8 w-28 h-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(165,180,252,0.16),transparent_70%)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none select-none font-serif absolute -bottom-2.5 right-2 text-[58px] sm:text-[68px] font-bold text-indigo-700/[0.11] dark:text-indigo-300/[0.12] leading-none"
            >
              Ω
            </span>
            <div className="relative z-10 h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/85 dark:bg-black/30 border border-indigo-200/80 dark:border-indigo-400/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shadow-sm">
              <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="relative z-10 mt-3.5 sm:mt-4 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                Original Text
              </span>
              <p className="font-serif text-sm sm:text-base font-semibold text-[#1C1917] dark:text-[#F5F0E8] leading-tight mt-0.5">
                Word &amp; Guides
              </p>
              <p className="text-[11px] sm:text-xs text-[#574F47] dark:text-[#C5BFD6] truncate mt-0.5">
                Greek · Hebrew · Lessons
              </p>
            </div>
          </button>

          {/* Right Stack: Record Sermon + Scan Bible */}
          <div className="col-span-6 flex flex-col gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => onQuickNavigate("record")}
              className="flex-1 relative text-left overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 bg-gradient-to-br from-[#FFF9EE] to-[#FAE7C5] dark:from-[#2C2113] dark:to-[#1C150D] border border-[#EDD09B] dark:border-[#523D1E] hover:border-[#B88435] shadow-sm active:scale-[0.985] transition group"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-6 w-20 h-20 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(245,194,107,0.14),transparent_70%)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none select-none font-serif absolute -bottom-2 right-2 text-4xl font-bold text-amber-800/[0.10] dark:text-amber-300/[0.10] leading-none"
              >
                ◉
              </span>
              <div className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/85 dark:bg-black/30 border border-amber-200/80 dark:border-amber-400/20 text-[#9A6B24] dark:text-[#F5C26B] flex items-center justify-center shrink-0 shadow-sm">
                <Mic className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="relative z-10 min-w-0">
                <p className="font-serif text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-[#F5F0E8] leading-tight truncate">
                  Record Sermon
                </p>
                <p className="text-[11px] text-[#6B5B45] dark:text-[#C9B79C] truncate">
                  Live audio &amp; notes
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onQuickNavigate("scan")}
              className="flex-1 relative text-left overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 bg-gradient-to-br from-[#F0FBF5] to-[#D6F2E3] dark:from-[#152A21] dark:to-[#101D17] border border-[#B6E4CB] dark:border-[#244D3B] hover:border-emerald-600/60 dark:hover:border-emerald-400/60 shadow-sm active:scale-[0.985] transition group"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-6 w-20 h-20 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(110,231,183,0.14),transparent_70%)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none select-none font-serif absolute -bottom-2 right-2 text-4xl font-bold text-emerald-700/[0.11] dark:text-emerald-300/[0.11] leading-none"
              >
                א
              </span>
              <div className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/85 dark:bg-black/30 border border-emerald-200/80 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-sm">
                <Camera className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="relative z-10 min-w-0">
                <p className="font-serif text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-[#F5F0E8] leading-tight truncate">
                  Scan Bible
                </p>
                <p className="text-[11px] text-[#456355] dark:text-[#A9C9BA] truncate">
                  Snap a printed page
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Row 3: Asymmetric Bottom — YouTube Study (Left 7) + Saved Library (Right 5) */}
        <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onQuickNavigate("youtube")}
            className="col-span-7 relative text-left overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 bg-gradient-to-br from-[#FFF3F4] to-[#FDE0E3] dark:from-[#2D181B] dark:to-[#1C1214] border border-[#F4C2C8] dark:border-[#542931] hover:border-rose-500/60 dark:hover:border-rose-400/60 shadow-sm active:scale-[0.985] transition group"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-6 -top-6 w-20 h-20 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(253,164,175,0.14),transparent_70%)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none select-none font-serif absolute -bottom-2 right-2.5 text-3xl font-bold text-rose-700/[0.11] dark:text-rose-300/[0.11] leading-none"
            >
              ▶
            </span>
            <div className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/85 dark:bg-black/30 border border-rose-200/80 dark:border-rose-400/20 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 shadow-sm">
              <Youtube className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="font-serif text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-[#F5F0E8] leading-tight truncate">
                YouTube Study
              </p>
              <p className="text-[11px] text-[#6D474D] dark:text-[#CFAEB3] truncate">
                Paste any sermon link
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleOpenSavedLibrary}
            className="col-span-5 relative text-left overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between gap-2 bg-gradient-to-br from-[#FFFDF9] to-[#F5ECDC] dark:from-[#211C16] dark:to-[#181511] border border-[#E4D5BC] dark:border-[#3A3024] hover:border-[#B88435] shadow-sm active:scale-[0.985] transition group"
          >
            <div className="min-w-0">
              <p className="font-serif text-xs sm:text-sm font-semibold text-[#1C1917] dark:text-[#F5F0E8] leading-tight truncate">
                Library
              </p>
              <p className="text-[11px] text-[#7B531A] dark:text-[#DFB164] font-medium truncate">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </p>
            </div>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-[#F7EAD0] dark:bg-[#33281A] border border-[#E5CCA0]/80 dark:border-[#4E3B21] text-[#9A6B24] dark:text-[#DFB164] flex items-center justify-center shrink-0">
              <LibraryIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </div>
          </button>
        </div>
      </div>

      {/* Collapsible Study Library & Series Drawer (1 sleek bar on phone until expanded; open on desktop) */}
      <div
        id="lamp-study-library"
        className="w-full min-w-0 rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] shadow-sm overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setLibraryDrawerOpen((v) => !v)}
          className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-left hover:bg-[#FAF7F2] dark:hover:bg-[#231F1B] transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164] shrink-0" />
            <span className="font-serif text-base sm:text-lg font-semibold text-[#1C1917] dark:text-[#F5F0E8] truncate">
              My Study Library &amp; Series
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F2ECE1] dark:bg-[#2A2520] text-[#7B531A] dark:text-[#DFB164] text-[11px] font-semibold shrink-0">
              {notes.length}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A6B24] dark:text-[#DFB164] shrink-0">
            <span className="sm:hidden">
              {libraryDrawerOpen ? "Hide" : "Browse"}
            </span>
            <span className="hidden sm:inline">
              {libraryDrawerOpen ? "Hide Library" : "Open Library"}
            </span>
            {libraryDrawerOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        <div
          className={`${
            libraryDrawerOpen || hasActiveQuery ? "block" : "hidden"
          } border-t border-[#EFE8DC] dark:border-[#2A2520] p-3 sm:p-4 space-y-3`}
        >
      {/* Search, Section Tabs & Collapsible Book/Chapter/Verse Selector */}
      <div className="w-full min-w-0 space-y-2.5 sm:space-y-3">
        {/* Top Row: Search + Mobile Scripture Jump Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#8C8278] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, themes, or verse..."
              className="w-full min-w-0 pl-9 pr-3 py-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FAF7F2] dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileSelectorOpen((v) => !v)}
            className={`sm:hidden px-2.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition ${
              mobileSelectorOpen
                ? "border-[#9A6B24] bg-[#FAF4E8] text-[#7B531A] dark:bg-[#33281A] dark:text-[#DFB164]"
                : "border-[#DFD5C5] dark:border-[#322C26] bg-[#FAF7F2] dark:bg-[#141210] text-[#574F47] dark:text-[#CFC5B9]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164]" />
            <span>Jump</span>
            {mobileSelectorOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Section Filter Pills: All · Word · Verse · Sermon · YouTube · Scan · Guides */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          {SECTION_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = sectionCounts[tab.id];
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition ${
                  active
                    ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210]"
                    : "bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#6B635B] dark:text-[#A39A90] hover:border-[#B88435]"
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active
                        ? "bg-white/20 dark:bg-black/15"
                        : "bg-[#ECE4D6] dark:bg-[#2A2520]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Smart Passage Jump Chip when typing a Bible reference in Search */}
        {parsedSearchRef && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F7EAD0]/60 dark:bg-[#33281A] border border-[#E5CCA0] dark:border-[#4B3A23] text-xs">
            <span className="text-[#5F4114] dark:text-[#E8C98F]">
              Detected passage:{" "}
              <strong>
                {parsedSearchRef.book} {parsedSearchRef.chapter}
                {parsedSearchRef.verse ? `:${parsedSearchRef.verse}` : ""}
              </strong>
            </span>
            <button
              type="button"
              onClick={() =>
                onOpenScripture(
                  `${parsedSearchRef.book} ${parsedSearchRef.chapter}${
                    parsedSearchRef.verse ? `:${parsedSearchRef.verse}` : ""
                  }`
                )
              }
              className="px-3 py-1 rounded-lg bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold inline-flex items-center gap-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Read Passage →
            </button>
          </div>
        )}

        {/* Compact Book, Chapter & Verse Selector Row (collapsible on phone, always shown on tablet/desktop) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOpenScripture(buildJumpReference());
          }}
          className={`${
            mobileSelectorOpen ? "flex" : "hidden sm:flex"
          } pt-2.5 border-t border-[#EFE8DC] dark:border-[#2A2520] flex-wrap items-center gap-2 min-w-0`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] inline-flex items-center gap-1.5 mr-1 w-full sm:w-auto">
            <BookOpen className="w-3.5 h-3.5" />
            Scripture Selector
          </span>

          <div className="grid grid-cols-12 gap-2 w-full sm:flex sm:w-auto sm:items-center min-w-0">
            <select
              aria-label="Select Bible Book"
              value={jumpBook}
              onChange={(e) => {
                setJumpBook(e.target.value);
                setJumpChapter(1);
                setJumpVerse("");
              }}
              className="col-span-6 sm:w-auto w-full min-w-0 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] px-2.5 py-2 sm:py-1.5 text-sm sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            >
              <optgroup label="Old Testament">
                {BIBLE_BOOKS.filter((b) => b.testament === "OT").map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="New Testament">
                {BIBLE_BOOKS.filter((b) => b.testament === "NT").map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <select
              aria-label="Select Chapter"
              value={jumpChapter}
              onChange={(e) => {
                setJumpChapter(parseInt(e.target.value, 10));
                setJumpVerse("");
              }}
              className="col-span-3 sm:w-auto w-full min-w-0 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] px-2 py-2 sm:py-1.5 text-sm sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            >
              {Array.from(
                { length: selectedJumpBookObj.chapters },
                (_, i) => i + 1
              ).map((ch) => (
                <option key={ch} value={ch}>
                  Ch. {ch}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={176}
              value={jumpVerse}
              onChange={(e) => setJumpVerse(e.target.value)}
              placeholder="V."
              aria-label="Verse number"
              className="col-span-3 sm:w-24 w-full min-w-0 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] px-2.5 py-2 sm:py-1.5 text-sm sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={() => setSearch(buildJumpReference())}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-xs font-medium transition"
            >
              Filter Notes
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Read {buildJumpReference()}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Series / Folders Filter Strip (compact slim pills) */}
      {allSeries.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] inline-flex items-center gap-1 shrink-0">
            <FolderOpen className="w-3 h-3 text-[#9A6B24] dark:text-[#DFB164]" />
            Series:
          </span>
          <button
            onClick={() => setSeriesFilter("all")}
            className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition ${
              seriesFilter === "all"
                ? "bg-[#9A6B24] text-white"
                : "bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#6B635B] dark:text-[#A39A90]"
            }`}
          >
            All
          </button>
          {allSeries.map((s) => (
            <button
              key={s}
              onClick={() => setSeriesFilter(s)}
              className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition ${
                seriesFilter === s
                  ? "bg-[#9A6B24] text-white"
                  : "bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#6B635B] dark:text-[#A39A90] hover:border-[#B88435]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Notes List: Ultra-compact expandable rows on phone, spacious 2-col cards on tablet/desktop */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 sm:h-44 rounded-2xl bg-[#F2ECE1]/70 dark:bg-[#1D1A17] animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl border border-dashed border-[#D9CEBC] dark:border-[#352F29] bg-[#FDFCFA]/70 dark:bg-[#1D1A17]/60 p-6 sm:p-12 text-center">
          <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#F7EAD0] dark:bg-[#33281A] flex items-center justify-center text-[#9A6B24] dark:text-[#DFB164] mb-3">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-semibold">
            No matching studies yet
          </h3>
          <p className="text-xs sm:text-sm text-[#6B635B] dark:text-[#A39A90] mt-1 max-w-md mx-auto">
            {hasActiveQuery
              ? "Try switching sections or clearing your search."
              : "Record a sermon, create a Word Study, summarize a YouTube message, or scan a Bible page to build your library."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Compact List (< sm) */}
          <div className="sm:hidden space-y-2">
            {mobileVisibleNotes.map((note) => {
              const isWord = isWordStudyNote(note);
              const meta = SOURCE_META[note.sourceType] || SOURCE_META.manual;
              const SourceIcon = isWord ? Languages : meta.icon;
              const badgeLabel = isWord ? "Word Study" : meta.label;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onSelectNote(note.id)}
                  className="w-full text-left rounded-xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] active:border-[#B88435] px-3 py-2.5 flex items-center justify-between gap-2.5 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${meta.badgeClass}`}
                      >
                        <SourceIcon className="w-2.5 h-2.5" />
                        {badgeLabel}
                      </span>
                      {note.series && (
                        <span className="text-[10px] text-[#7B531A] dark:text-[#DFB164] truncate max-w-[110px]">
                          · {note.series}
                        </span>
                      )}
                      {note.pinned && (
                        <Pin className="w-2.5 h-2.5 text-[#9A6B24] dark:text-[#DFB164] fill-current shrink-0" />
                      )}
                    </div>
                    <p className="font-serif text-sm font-semibold leading-snug text-[#1C1917] dark:text-[#F5F0E8] truncate">
                      {note.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#8C8278] shrink-0">
                    <span>
                      {new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}

            {!hasActiveQuery && filteredNotes.length > 2 && (
              <button
                type="button"
                onClick={() => setMobileExpanded((v) => !v)}
                className="w-full py-2 rounded-xl bg-[#F5EFE5] dark:bg-[#191613] border border-[#E6DCCB] dark:border-[#2F2A24] text-xs font-semibold text-[#7B531A] dark:text-[#DFB164] inline-flex items-center justify-center gap-1.5 transition"
              >
                {mobileExpanded ? (
                  <>
                    Show Less
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Show All {filteredNotes.length} Saved Studies
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tablet / Desktop Full 2-Column Card Grid (>= sm) */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const isWord = isWordStudyNote(note);
              const meta = SOURCE_META[note.sourceType] || SOURCE_META.manual;
              const SourceIcon = isWord ? Languages : meta.icon;
              const badgeLabel = isWord ? "Word Study" : meta.label;
              const doneCount = note.actionableTakeaways.filter(
                (t) => t.completed
              ).length;
              const totalCount = note.actionableTakeaways.length;

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelectNote(note.id);
                  }}
                  className="group rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] hover:border-[#B88435] hover:shadow-md p-5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.badgeClass}`}
                      >
                        <SourceIcon className="w-3 h-3" />
                        {badgeLabel}
                      </span>
                      {note.series && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#F2ECE1] dark:bg-[#2A2520] text-[#574F47] dark:text-[#C9BFB3] truncate max-w-[140px]">
                          <FolderOpen className="w-3 h-3 shrink-0 text-[#9A6B24]" />
                          <span className="truncate">{note.series}</span>
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-xs text-[#8C8278]">
                        {note.pinned && (
                          <Pin className="w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164] fill-current" />
                        )}
                        <span>
                          {new Date(note.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-serif text-xl font-semibold leading-snug text-[#1C1917] dark:text-[#F5F0E8] group-hover:text-[#9A6B24] dark:group-hover:text-[#DFB164] transition">
                      {note.title}
                    </h3>

                    {(note.speaker || note.churchOrChannel) && (
                      <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-1">
                        {[note.speaker, note.churchOrChannel]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    <p className="text-sm text-[#574F47] dark:text-[#BDB4AA] mt-2.5 line-clamp-3 leading-relaxed">
                      {note.summary || note.personalNotes}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F0E9DC] dark:border-[#2A2520] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {note.scriptureReferences.slice(0, 2).map((ref, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#F7EAD0]/70 dark:bg-[#33281A] text-[#7B531A] dark:text-[#E8C98F] text-[11px] font-medium"
                        >
                          {ref.reference}
                        </span>
                      ))}
                      {note.scriptureReferences.length > 2 && (
                        <span className="text-[11px] text-[#8C8278]">
                          +{note.scriptureReferences.length - 2} more
                        </span>
                      )}
                    </div>

                    {totalCount > 0 && (
                      <span className="text-[11px] text-[#6B635B] dark:text-[#A39A90]">
                        {doneCount}/{totalCount} takeaways
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
