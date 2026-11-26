"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { AppSettings, NoteSourceType, StudyNote } from "@/lib/types";
import { formatDuration, noteToMarkdown } from "@/lib/client-api";
import { BIBLE_BOOKS, parseScriptureReference } from "@/lib/bible-books";
import AskVesselChat from "./AskVesselChat";

interface LibraryViewProps {
  settings: AppSettings;
  notes: StudyNote[];
  loading: boolean;
  selectedNoteId: string | null;
  onSelectNote: (id: string | null) => void;
  onUpdateNote: (id: string, updates: Partial<StudyNote>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onOpenScripture: (reference: string) => void;
  onQuickNavigate: (tab: "record" | "youtube" | "bible" | "scan") => void;
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

export default function LibraryView({
  settings,
  notes,
  loading,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onOpenScripture,
  onQuickNavigate,
}: LibraryViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | NoteSourceType>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
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
  const [personalDraft, setPersonalDraft] = useState("");
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
      setPersonalDraft(selectedNote.personalNotes || "");
      setSeriesDraft(selectedNote.series || "");
      setShowTranscript(false);
    }
  }, [selectedNote?.id]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filter !== "all" && note.sourceType !== filter) return false;
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

  const handleSavePersonalNotes = async () => {
    if (!selectedNote) return;
    setSavingNotes(true);
    try {
      await onUpdateNote(selectedNote.id, { personalNotes: personalDraft });
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

            {/* Personal Reflections Editor */}
            <section className="pt-4 border-t border-[#EFE8DC] dark:border-[#2A2520]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90]">
                  Your Personal Reflections & Journal
                </h2>
                <button
                  onClick={handleSavePersonalNotes}
                  disabled={savingNotes || personalDraft === (selectedNote.personalNotes || "")}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#9A6B24] text-white disabled:opacity-40 hover:bg-[#7B531A] transition"
                >
                  {savingNotes ? "Saving..." : "Save Journal"}
                </button>
              </div>
              <textarea
                value={personalDraft}
                onChange={(e) => setPersonalDraft(e.target.value)}
                rows={4}
                placeholder="Write prayers, personal convictions, or follow-up thoughts here..."
                className="w-full rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FAF7F2] dark:bg-[#141210] p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
              />
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
      </div>
    );
  }

  // Library Index View
  return (
    <div className="max-w-5xl mx-auto pb-6 space-y-6">
      {/* Header & Quick Capture Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A6B24] dark:text-[#DFB164]">
            Your Study Archive
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
            Scripture & Sermon Library
          </h1>
        </div>

        <div className="hidden lg:flex flex-wrap gap-2">
          <button
            onClick={() => onQuickNavigate("record")}
            className="px-4 py-2.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-sm font-semibold shadow-sm inline-flex items-center gap-2 transition"
          >
            <Mic className="w-4 h-4" />
            Record Sermon
          </button>
          <button
            onClick={() => onQuickNavigate("youtube")}
            className="px-3.5 py-2.5 rounded-xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] hover:border-[#B88435] text-sm font-medium inline-flex items-center gap-2 transition"
          >
            <Youtube className="w-4 h-4 text-rose-600" />
            YouTube
          </button>
          <button
            onClick={() => onQuickNavigate("scan")}
            className="px-3.5 py-2.5 rounded-xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] hover:border-[#B88435] text-sm font-medium inline-flex items-center gap-2 transition"
          >
            <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            Scan Page
          </button>
        </div>
      </div>

      {/* Search, Theme Filter & Quick Book/Chapter/Verse Selector */}
      <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search themes, sermons, speakers, or type a verse (e.g. Romans 8:28)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FAF7F2] dark:bg-[#141210] text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
            {(["all", "sermon", "youtube", "scan", "verse"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  filter === tab
                    ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210]"
                    : "bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#6B635B] dark:text-[#A39A90] hover:border-[#B88435]"
                }`}
              >
                {tab === "all"
                  ? `All (${notes.length})`
                  : SOURCE_META[tab].label}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Passage Jump Chip when typing a Bible reference in Search */}
        {parsedSearchRef && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F7EAD0]/60 dark:bg-[#33281A] border border-[#E5CCA0] dark:border-[#4B3A23] text-xs">
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

        {/* Compact Book, Chapter & Verse Selector Row */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOpenScripture(buildJumpReference());
          }}
          className="pt-2.5 border-t border-[#EFE8DC] dark:border-[#2A2520] flex flex-wrap items-center gap-2"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] inline-flex items-center gap-1.5 mr-1">
            <BookOpen className="w-3.5 h-3.5" />
            Scripture Selector
          </span>

          <select
            aria-label="Select Bible Book"
            value={jumpBook}
            onChange={(e) => {
              setJumpBook(e.target.value);
              setJumpChapter(1);
              setJumpVerse("");
            }}
            className="rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
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
            className="rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
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
            placeholder="Verse (opt.)"
            aria-label="Verse number"
            className="w-24 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
          />

          <div className="flex items-center gap-1.5 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={() => setSearch(buildJumpReference())}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-xs font-medium transition"
            >
              Filter Notes
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Read {buildJumpReference()}
            </button>
          </div>
        </form>
      </div>

      {/* Series / Folders Filter Strip */}
      {allSeries.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] inline-flex items-center gap-1 shrink-0">
            <FolderOpen className="w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164]" />
            Series:
          </span>
          <button
            onClick={() => setSeriesFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              seriesFilter === "all"
                ? "bg-[#9A6B24] text-white"
                : "bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#6B635B] dark:text-[#A39A90]"
            }`}
          >
            All Series
          </button>
          {allSeries.map((s) => (
            <button
              key={s}
              onClick={() => setSeriesFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
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

      {/* Notes Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-[#F2ECE1]/70 dark:bg-[#1D1A17] animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D9CEBC] dark:border-[#352F29] bg-[#FDFCFA]/70 dark:bg-[#1D1A17]/60 p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#F7EAD0] dark:bg-[#33281A] flex items-center justify-center text-[#9A6B24] dark:text-[#DFB164] mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-semibold">No study notes found</h3>
          <p className="text-sm text-[#6B635B] dark:text-[#A39A90] mt-1 max-w-md mx-auto">
            {search
              ? "Try a different search term or clear your filter."
              : "Record your first Sunday sermon, summarize a YouTube message, or scan a printed Bible page to build your personal study library."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const meta = SOURCE_META[note.sourceType] || SOURCE_META.manual;
            const SourceIcon = meta.icon;
            const doneCount = note.actionableTakeaways.filter((t) => t.completed).length;
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
                      {meta.label}
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
                      {[note.speaker, note.churchOrChannel].filter(Boolean).join(" · ")}
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
      )}
    </div>
  );
}
