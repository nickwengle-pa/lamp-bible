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
  Languages,
  Menu,
  X,
  LogOut,
  RefreshCw,
} from "lucide-react";
import {
  AppSettings,
  HighlightColor,
  StudyNote,
  UserProfile,
  VerseHighlight,
} from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  formatDuration,
  loadSettings,
  loadThemePreference,
  saveSettings,
} from "@/lib/client-api";
import { parseScriptureReference } from "@/lib/bible-books";
import LibraryView from "./LibraryView";
import SermonRecorderView from "./SermonRecorderView";
import YouTubeSummarizerView from "./YouTubeSummarizerView";
import BibleReaderView from "./BibleReaderView";
import ScriptureScannerView from "./ScriptureScannerView";
import WordStudyView from "./WordStudyView";
import SettingsModal from "./SettingsModal";
import AuthScreen from "./AuthScreen";
import { LampMark, LampTitleLockup } from "./LampBrand";

type ActiveTab = "library" | "words" | "record" | "youtube" | "bible" | "scan";

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "library", label: "Home & Library", shortLabel: "Home", icon: Library },
  { id: "words", label: "Word & Guided Study", shortLabel: "Words", icon: Languages },
  { id: "bible", label: "Bible Reader", shortLabel: "Bible", icon: BookOpen },
  { id: "record", label: "Record Sermon", shortLabel: "Record", icon: Mic },
  { id: "youtube", label: "YouTube Study", shortLabel: "YouTube", icon: Youtube },
  { id: "scan", label: "Scripture Scan", shortLabel: "Scan", icon: Camera },
];

export default function VesselApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Record<string, VerseHighlight>>(
    {}
  );

  const [serverConfig, setServerConfig] = useState<{
    hasServerGeminiKey: boolean;
    hasServerEsvKey: boolean;
    hasServerApiBibleKey?: boolean;
  }>({ hasServerGeminiKey: false, hasServerEsvKey: false, hasServerApiBibleKey: false });
  const [configLoaded, setConfigLoaded] = useState(false);

  // Multi-user Auth & Profile state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [inviteRequired, setInviteRequired] = useState(false);
  const [ownerSetupRequired, setOwnerSetupRequired] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [inviteCode, setInviteCode] = useState("");

  // Live Sermon Recorder background status (kept mounted across tab switches!)
  const [recorderStatus, setRecorderStatus] = useState<{
    isRecording: boolean;
    isPaused: boolean;
    seconds: number;
    hasUnsaved: boolean;
  }>({ isRecording: false, isPaused: false, seconds: 0, hasUnsaved: false });

  const [bibleTarget, setBibleTarget] = useState<{
    book: string;
    chapter: number;
    verse?: number;
    translation?: string;
  }>({ book: "John", chapter: 1, verse: 1 });

  useEffect(() => {
    const theme = loadThemePreference();
    setSettings({ ...DEFAULT_SETTINGS, theme });
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  // Scope browser settings & API credentials strictly to the signed-in account
  useEffect(() => {
    if (user) {
      const scoped = loadSettings(user.id, user.role);
      setSettings(scoped);
      document.documentElement.classList.toggle("dark", scoped.theme === "dark");
    } else {
      const theme = loadThemePreference();
      setSettings({ ...DEFAULT_SETTINGS, theme });
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [user?.id, user?.role]);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = (await res.json()) as {
          user: UserProfile | null;
          userCount: number;
          inviteRequired: boolean;
          ownerSetupRequired?: boolean;
          members?: UserProfile[];
          inviteCode?: string;
        };
        setUser(data.user);
        setUserCount(data.userCount || 0);
        setInviteRequired(Boolean(data.inviteRequired));
        setOwnerSetupRequired(Boolean(data.ownerSetupRequired));
        setMembers(data.members || []);
        setInviteCode(data.inviteCode || "");
      }
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next, user?.id);
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
        const data = (await notesRes.json()) as { notes?: StudyNote[] };
        setNotes(data.notes || []);
      }
      if (hlRes.ok) {
        const data = (await hlRes.json()) as {
          highlights?: Record<string, VerseHighlight>;
        };
        setHighlights(data.highlights || {});
      }
      if (cfgRes.ok) {
        const data = (await cfgRes.json()) as {
          hasServerGeminiKey?: boolean;
          hasServerEsvKey?: boolean;
          hasServerApiBibleKey?: boolean;
        };
        setServerConfig({
          hasServerGeminiKey: Boolean(data.hasServerGeminiKey),
          hasServerEsvKey: Boolean(data.hasServerEsvKey),
          hasServerApiBibleKey: Boolean(data.hasServerApiBibleKey),
        });
        setConfigLoaded(true);
      }
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotesAndHighlights();
    }
  }, [user?.id, fetchNotesAndHighlights]);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setNotes([]);
    setHighlights({});
    setSelectedNoteId(null);
    setSettingsOpen(false);
    setMobileMenuOpen(false);
    const theme = loadThemePreference();
    setSettings({ ...DEFAULT_SETTINGS, theme });
    setRecorderStatus({
      isRecording: false,
      isPaused: false,
      seconds: 0,
      hasUnsaved: false,
    });
    refreshAuth();
  };

  // Resolve effective default translation: preserve explicit choice, else pick ESV if configured or keyless BSB
  const effectiveDefaultTranslation = useMemo(() => {
    if (settings.defaultTranslation) return settings.defaultTranslation;
    if (settings.esvApiKey?.trim() || serverConfig.hasServerEsvKey) return "esv";
    return "bsb";
  }, [settings.defaultTranslation, settings.esvApiKey, serverConfig.hasServerEsvKey]);

  const effectiveSettings = useMemo<AppSettings>(
    () => ({
      ...settings,
      defaultTranslation: effectiveDefaultTranslation,
    }),
    [settings, effectiveDefaultTranslation]
  );

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
    const data = (await res.json()) as { note?: StudyNote };
    if (data.note) {
      const created = data.note;
      setNotes((prev) => [created, ...prev]);
      return created;
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
      const data = (await res.json()) as { note?: StudyNote };
      if (data.note) {
        const updated = data.note;
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      }
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
      const data = (await res.json()) as {
        highlights?: Record<string, VerseHighlight>;
      };
      if (data.highlights) setHighlights(data.highlights);
    }
  };

  const handleDeleteHighlight = async (key: string) => {
    const res = await fetch(
      `/api/highlights?key=${encodeURIComponent(key)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        highlights?: Record<string, VerseHighlight>;
      };
      if (data.highlights) setHighlights(data.highlights);
    }
  };

  const handleOpenScripture = (reference: string) => {
    const parsed = parseScriptureReference(reference);
    if (parsed) {
      setBibleTarget((prev) => ({
        book: parsed.book,
        chapter: parsed.chapter,
        verse: parsed.verse,
        translation: prev.translation,
      }));
    }
    setActiveTab("bible");
  };

  const handleOpenLibraryNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setActiveTab("library");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] dark:bg-[#141210]">
        <LampMark className="w-12 h-10 text-[#1C1917] dark:text-[#F5F0E8] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        userCount={userCount}
        inviteRequired={inviteRequired}
        ownerSetupRequired={ownerSetupRequired}
        onAuthenticated={(signedInUser) => {
          setUser(signedInUser);
          refreshAuth();
        }}
      />
    );
  }

  const hasApiKey =
    Boolean(settings.geminiApiKey.trim()) || serverConfig.hasServerGeminiKey;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#F5EFE5] dark:bg-[#191613] border-r border-[#E6DCCB] dark:border-[#2A2520] px-4 py-6 justify-between">
        <div>
          {/* Brand */}
          <div className="px-1.5 mb-8">
            <LampTitleLockup size="md" subtitle="BIBLE STUDY & WORD NOTES" />
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
          {/* Signed-in User Profile Pill */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24]">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2.5 min-w-0 text-left"
            >
              <div
                className="h-7 w-7 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0"
                style={{ backgroundColor: user.avatarColor || "#9A6B24" }}
              >
                {user.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{user.displayName}</p>
                <p className="text-[10px] text-[#786F66] dark:text-[#9C9288] truncate">
                  {user.church || user.email}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#786F66] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {user.role === "admin" && (
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
                  <span className="truncate">AI &amp; Bible APIs Connected</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span className="truncate">Configure API Keys</span>
                </>
              )}
            </button>
          )}

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
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#FAF7F2]/95 dark:bg-[#141210]/95 backdrop-blur-md border-b border-[#E6DCCB] dark:border-[#2A2520] px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setActiveTab("library");
            setSelectedNoteId(null);
          }}
          className="text-left"
        >
          <LampTitleLockup size="sm" subtitle="PSALM 119:105" />
        </button>

        <div className="flex items-center gap-1.5">
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
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl border border-[#E6DCCB] dark:border-[#322C26] bg-[#FDFCFA] dark:bg-[#1D1A17] text-[#1C1917] dark:text-[#F5F0E8] hover:border-[#B88435] transition"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Hamburger Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div
            className="flex-1"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="w-72 max-w-[85vw] h-full bg-[#F5EFE5] dark:bg-[#191613] border-l border-[#E6DCCB] dark:border-[#2A2520] p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E6DCCB] dark:border-[#2A2520]">
                <LampTitleLockup size="sm" subtitle="BIBLE STUDY & NOTES" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-[#6B635B] hover:bg-[#EBE3D6] dark:hover:bg-[#25201B]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id === "library") setSelectedNoteId(null);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                        active
                          ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] shadow-sm"
                          : "text-[#574F47] dark:text-[#BDB4AA] hover:bg-[#EBE3D6] dark:hover:bg-[#25201B]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#E6DCCB] dark:border-[#2A2520]">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24]">
                <div
                  className="h-8 w-8 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: user.avatarColor || "#9A6B24" }}
                >
                  {user.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-[#786F66] dark:text-[#9C9288] truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#2F2A24] bg-[#FDFCFA] dark:bg-[#1D1A17] text-xs font-semibold transition"
              >
                <Settings className="w-4 h-4 text-[#9A6B24]" />
                Profile & Settings
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#DFD5C5] dark:border-[#2F2A24] bg-[#FDFCFA] dark:bg-[#1D1A17] text-xs font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#9A6B24]" />
                  Refresh App
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-400 text-xs font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 w-full lg:pl-64 pb-24 lg:pb-8">
        <div className="w-full max-w-full px-3.5 sm:px-8 py-5 sm:py-8">
          {/* Active background recording/draft banner when navigating to Bible or other tabs */}
          {activeTab !== "record" &&
            (recorderStatus.isRecording || recorderStatus.hasUnsaved) && (
              <div className="max-w-5xl mx-auto mb-4 rounded-2xl bg-[#FAF4E8] dark:bg-[#251E15] border border-[#DFC9A3] dark:border-[#4A3A22] px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      recorderStatus.isRecording && !recorderStatus.isPaused
                        ? "bg-rose-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="font-medium text-[#5F4114] dark:text-[#E8C98F] truncate">
                    {recorderStatus.isRecording
                      ? recorderStatus.isPaused
                        ? `Sermon recording paused (${formatDuration(recorderStatus.seconds) || "0:00"})`
                        : `Recording sermon in background (${formatDuration(recorderStatus.seconds) || "0:00"})`
                      : "You have an unsaved sermon recording or notes in progress"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("record")}
                  className="px-3 py-1 rounded-lg bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold shrink-0 transition"
                >
                  Return to Recorder
                </button>
              </div>
            )}

          {activeTab === "library" && (
            <>
              <LibraryView
                settings={effectiveSettings}
                notes={notes}
                loading={loadingNotes}
                selectedNoteId={selectedNoteId}
                onSelectNote={setSelectedNoteId}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onOpenScripture={handleOpenScripture}
                onQuickNavigate={(tab) => setActiveTab(tab)}
              />

              {!selectedNoteId && configLoaded && (
                <section className="max-w-5xl mx-auto mt-4 pt-8 border-t border-[#E6DCCB] dark:border-[#2A2520] pb-16">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A6B24] dark:text-[#DFB164]">
                      Daily Scripture Reading
                    </p>
                    <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight mt-0.5">
                      Bible Reader
                    </h2>
                  </div>
                  <BibleReaderView
                    embedded
                    settings={effectiveSettings}
                    initialBook={bibleTarget.book}
                    initialChapter={bibleTarget.chapter}
                    initialTranslation={bibleTarget.translation}
                    highlightVerse={bibleTarget.verse}
                    notes={notes}
                    highlights={highlights}
                    onSaveHighlight={handleSaveHighlight}
                    onDeleteHighlight={handleDeleteHighlight}
                    onOpenLibraryNote={handleOpenLibraryNote}
                    onSaveVerseNote={handleSaveManualNote}
                    onOpenSettings={() => setSettingsOpen(true)}
                    onExpandFullScreen={(loc) => {
                      setBibleTarget(loc);
                      setActiveTab("bible");
                    }}
                  />
                </section>
              )}
            </>
          )}

          {activeTab === "words" && (
            <WordStudyView
              settings={effectiveSettings}
              onOpenScripture={handleOpenScripture}
              onNoteCreated={handleNoteCreated}
            />
          )}

          {/* Keep SermonRecorderView mounted across tab switches so active recordings & drafts are never lost */}
          <div className={activeTab === "record" ? "block" : "hidden"}>
            <SermonRecorderView
              settings={effectiveSettings}
              existingSeries={existingSeries}
              onNoteCreated={handleNoteCreated}
              onOpenSettings={() => setSettingsOpen(true)}
              onRecordingStatusChange={setRecorderStatus}
            />
          </div>

          {activeTab === "youtube" && (
            <YouTubeSummarizerView
              settings={effectiveSettings}
              existingSeries={existingSeries}
              onNoteCreated={handleNoteCreated}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {activeTab === "bible" && (
            <BibleReaderView
              settings={effectiveSettings}
              initialBook={bibleTarget.book}
              initialChapter={bibleTarget.chapter}
              initialTranslation={bibleTarget.translation}
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
              settings={effectiveSettings}
              onOpenScripture={handleOpenScripture}
              onSaveScanNote={handleSaveManualNote}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar — 4 spacious core tabs (YouTube & Scan live cleanly in the Hamburger Menu) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FDFCFA]/95 dark:bg-[#191613]/95 backdrop-blur-md border-t border-[#E6DCCB] dark:border-[#2A2520] px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] grid grid-cols-4">
        {NAV_ITEMS.filter((i) =>
          ["library", "bible", "words", "record"].includes(i.id)
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === "library") setSelectedNoteId(null);
              }}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[11px] font-medium transition ${
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
        user={user}
        members={members}
        inviteCode={inviteCode}
        onProfileUpdated={(updatedUser, nextInvite) => {
          setUser(updatedUser);
          if (nextInvite !== undefined) setInviteCode(nextInvite);
          refreshAuth();
        }}
        onSignOut={handleSignOut}
        serverConfig={serverConfig}
      />
    </div>
  );
}
