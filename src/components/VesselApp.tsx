"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Library,
  Mic,
  Youtube,
  BookOpen,
  Camera,
  Settings,
  Sun,
  Moon,
  KeyRound,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  AppSettings,
  HighlightColor,
  StudyNote,
  VerseHighlight,
} from "@/lib/types";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/client-api";
import { parseScriptureReference } from "@/lib/bible-books";
import LibraryView from "./LibraryView";
import SermonRecorderView from "./SermonRecorderView";
import YouTubeSummarizerView from "./YouTubeSummarizerView";
import BibleReaderView from "./BibleReaderView";
import ScriptureScannerView from "./ScriptureScannerView";
import SettingsModal from "./SettingsModal";
import LockScreen from "./LockScreen";

type ActiveTab = "library" | "record" | "youtube" | "bible" | "scan";

const UNLOCK_STORAGE_KEY = "vessel_device_unlocked_v1";

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "library", label: "Study Library", shortLabel: "Library", icon: Library },
  { id: "record", label: "Record Sermon", shortLabel: "Record", icon: Mic },
  { id: "youtube", label: "YouTube Study", shortLabel: "YouTube", icon: Youtube },
  { id: "bible", label: "Bible Reader", shortLabel: "Bible", icon: BookOpen },
  { id: "scan", label: "Scripture Scan", shortLabel: "Scan", icon: Camera },
];

export default function VesselApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Record<string, VerseHighlight>>(
    {}
  );

  const [serverConfig, setServerConfig] = useState<{
    hasServerGeminiKey: boolean;
    hasServerEsvKey: boolean;
  }>({ hasServerGeminiKey: false, hasServerEsvKey: false });

  // Privacy Passcode Lock state
  const [checkingLock, setCheckingLock] = useState(true);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(true);

  const [bibleTarget, setBibleTarget] = useState<{
    book: string;
    chapter: number;
    verse?: number;
  }>({ book: "John", chapter: 15 });

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    document.documentElement.classList.toggle("dark", loaded.theme === "dark");
  }, []);

  // Check if Privacy Passcode Lock is enabled on Cloudflare
  useEffect(() => {
    fetch("/api/lock")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((data) => {
        const enabled = Boolean(data?.enabled);
        setLockEnabled(enabled);
        if (enabled) {
          const remembered =
            window.localStorage.getItem(UNLOCK_STORAGE_KEY) === "1" ||
            window.sessionStorage.getItem(UNLOCK_STORAGE_KEY) === "1";
          setUnlocked(remembered);
        } else {
          setUnlocked(true);
        }
      })
      .catch(() => setUnlocked(true))
      .finally(() => setCheckingLock(false));
  }, []);

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
    document.documentElement.classList.toggle("dark", next.theme === "dark");
  };

  const toggleTheme = () => {
    handleUpdateSettings({
      ...settings,
      theme: settings.theme === "dark" ? "light" : "dark",
    });
  };

  const fetchNotesAndHighlights = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const [notesRes, hlRes, cfgRes] = await Promise.all([
        fetch("/api/notes"),
        fetch("/api/highlights"),
        fetch("/api/config-status"),
      ]);
      if (notesRes.ok) {
        const data = await notesRes.json();
        setNotes(data.notes || []);
      }
      if (hlRes.ok) {
        const data = await hlRes.json();
        setHighlights(data.highlights || {});
      }
      if (cfgRes.ok) {
        const data = await cfgRes.json();
        setServerConfig(data);
      }
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) {
      fetchNotesAndHighlights();
    }
  }, [unlocked, fetchNotesAndHighlights]);

  const existingSeries = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.series?.trim()) set.add(n.series.trim());
    });
    return Array.from(set).sort();
  }, [notes]);

  const handleNoteCreated = (note: StudyNote) => {
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
    setSelectedNoteId(note.id);
    setActiveTab("library");
  };

  const handleSaveManualNote = async (
    payload: Partial<StudyNote>
  ): Promise<StudyNote | null> => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.note) {
      setNotes((prev) => [data.note, ...prev]);
      return data.note;
    }
    return null;
  };

  const handleUpdateNote = async (id: string, updates: Partial<StudyNote>) => {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === id ? data.note : n)));
    }
  };

  const handleDeleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleSaveHighlight = async (
    book: string,
    chapter: number,
    verse: number,
    color: HighlightColor,
    note?: string
  ) => {
    const res = await fetch("/api/highlights", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, chapter, verse, color, note }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.highlights) setHighlights(data.highlights);
    }
  };

  const handleDeleteHighlight = async (key: string) => {
    const res = await fetch(
      `/api/highlights?key=${encodeURIComponent(key)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.highlights) setHighlights(data.highlights);
    }
  };

  const handleOpenScripture = (reference: string) => {
    const parsed = parseScriptureReference(reference);
    if (parsed) {
      setBibleTarget({
        book: parsed.book,
        chapter: parsed.chapter,
        verse: parsed.verse,
      });
    }
    setActiveTab("bible");
  };

  const handleOpenLibraryNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setActiveTab("library");
  };

  const handleLockNow = () => {
    window.localStorage.removeItem(UNLOCK_STORAGE_KEY);
    window.sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
    setUnlocked(false);
  };

  if (checkingLock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] dark:bg-[#141210]">
        <img src="/icon.svg" alt="Vessel" className="w-10 h-10 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (lockEnabled && !unlocked) {
    return (
      <LockScreen
        onUnlocked={(remember) => {
          if (remember) {
            window.localStorage.setItem(UNLOCK_STORAGE_KEY, "1");
          } else {
            window.sessionStorage.setItem(UNLOCK_STORAGE_KEY, "1");
          }
          setUnlocked(true);
        }}
      />
    );
  }

  const hasApiKey =
    Boolean(settings.geminiApiKey.trim()) || serverConfig.hasServerGeminiKey;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#F5EFE5] dark:bg-[#191613] border-r border-[#E6DCCB] dark:border-[#2A2520] px-4 py-6 justify-between">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <img src="/icon.svg" alt="Vessel Logo" className="w-9 h-9 rounded-xl shadow-sm" />
            <div>
              <span className="font-serif text-2xl font-semibold tracking-tight block leading-none">
                Vessel
              </span>
              <span className="text-[11px] text-[#786F66] dark:text-[#9C9288]">
                Bible Study & Notes
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === "library") setSelectedNoteId(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] shadow-sm"
                      : "text-[#574F47] dark:text-[#BDB4AA] hover:bg-[#EBE3D6] dark:hover:bg-[#25201B]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === "library" && notes.length > 0 && (
                    <span
                      className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${
                        active
                          ? "bg-white/20 text-white dark:bg-black/15 dark:text-[#141210]"
                          : "bg-[#E6DCCB] dark:bg-[#2E2923]"
                      }`}
                    >
                      {notes.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-2 pt-4 border-t border-[#E6DCCB] dark:border-[#2A2520]">
          <button
            onClick={() => setSettingsOpen(true)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
              hasApiKey
                ? "bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900"
                : "bg-[#F7EAD0] text-[#7B531A] dark:bg-[#33281A] dark:text-[#E8C98F] border border-[#E5CCA0] dark:border-[#4A3A22]"
            }`}
          >
            {hasApiKey ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Gemini AI Connected</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 shrink-0" />
                <span className="truncate">Add Free Gemini Key</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#DFD5C5] dark:border-[#2F2A24] text-xs font-medium hover:bg-[#EBE3D6] dark:hover:bg-[#25201B] transition"
            >
              {settings.theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </>
              )}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#DFD5C5] dark:border-[#2F2A24] text-xs font-medium hover:bg-[#EBE3D6] dark:hover:bg-[#25201B] transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            {lockEnabled && (
              <button
                onClick={handleLockNow}
                title="Lock Vessel"
                className="p-2 rounded-xl border border-[#DFD5C5] dark:border-[#2F2A24] text-[#6B635B] hover:bg-[#EBE3D6] dark:hover:bg-[#25201B] transition"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#FAF7F2]/95 dark:bg-[#141210]/95 backdrop-blur-md border-b border-[#E6DCCB] dark:border-[#2A2520] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="Vessel Logo" className="w-7 h-7 rounded-lg" />
          <span className="font-serif text-xl font-semibold">Vessel</span>
        </div>

        <div className="flex items-center gap-1.5">
          {lockEnabled && (
            <button
              onClick={handleLockNow}
              className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A90] hover:bg-[#F2ECE1] dark:hover:bg-[#25201B]"
              aria-label="Lock Vessel"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A90] hover:bg-[#F2ECE1] dark:hover:bg-[#25201B]"
            aria-label="Toggle theme"
          >
            {settings.theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${
              hasApiKey
                ? "border border-[#E6DCCB] dark:border-[#322C26]"
                : "bg-[#F7EAD0] text-[#7B531A] dark:bg-[#33281A] dark:text-[#E8C98F]"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {hasApiKey ? "Settings" : "Add Key"}
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 lg:pl-64 pb-20 lg:pb-8">
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          {activeTab === "library" && (
            <LibraryView
              settings={settings}
              notes={notes}
              loading={loadingNotes}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onOpenScripture={handleOpenScripture}
              onQuickNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "record" && (
            <SermonRecorderView
              settings={settings}
              existingSeries={existingSeries}
              onNoteCreated={handleNoteCreated}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === "youtube" && (
            <YouTubeSummarizerView
              settings={settings}
              existingSeries={existingSeries}
              onNoteCreated={handleNoteCreated}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === "bible" && (
            <BibleReaderView
              settings={settings}
              initialBook={bibleTarget.book}
              initialChapter={bibleTarget.chapter}
              highlightVerse={bibleTarget.verse}
              notes={notes}
              highlights={highlights}
              onSaveHighlight={handleSaveHighlight}
              onDeleteHighlight={handleDeleteHighlight}
              onOpenLibraryNote={handleOpenLibraryNote}
              onSaveVerseNote={handleSaveManualNote}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === "scan" && (
            <ScriptureScannerView
              settings={settings}
              onOpenScripture={handleOpenScripture}
              onSaveScanNote={handleSaveManualNote}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FDFCFA]/95 dark:bg-[#191613]/95 backdrop-blur-md border-t border-[#E6DCCB] dark:border-[#2A2520] px-2 py-1.5 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === "library") setSelectedNoteId(null);
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition ${
                active
                  ? "text-[#9A6B24] dark:text-[#DFB164]"
                  : "text-[#786F66] dark:text-[#9C9288]"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.4]" : ""}`} />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        notes={notes}
        serverConfig={serverConfig}
        lockEnabled={lockEnabled}
        onLockChanged={(enabled) => {
          setLockEnabled(enabled);
          if (enabled) {
            window.localStorage.setItem(UNLOCK_STORAGE_KEY, "1");
          }
        }}
      />
    </div>
  );
}
