"use client";

import React, { useState } from "react";
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sun,
  Moon,
  Download,
  Sparkles,
  Lock,
  ShieldCheck,
  User,
  Users,
  LogOut,
} from "lucide-react";
import { AppSettings, StudyNote, UserProfile } from "@/lib/types";
import { BIBLE_TRANSLATIONS } from "@/lib/bible-books";
import { aiHeaders } from "@/lib/client-api";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  notes: StudyNote[];
  user?: UserProfile | null;
  members?: UserProfile[];
  inviteCode?: string;
  onProfileUpdated?: (user: UserProfile, nextInviteCode?: string) => void;
  onSignOut?: () => void;
  serverConfig?: {
    hasServerGeminiKey: boolean;
    hasServerEsvKey: boolean;
  };
  lockEnabled?: boolean;
  onLockChanged?: (enabled: boolean) => void;
}

const FALLBACK_GEMINI_MODELS = [
  { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest (Recommended — Fast)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
];

export default function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  notes,
  user,
  members = [],
  inviteCode = "",
  onProfileUpdated,
  onSignOut,
  serverConfig,
  lockEnabled = false,
  onLockChanged,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [models, setModels] = useState(FALLBACK_GEMINI_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Profile & Admin Invite state
  const [profileName, setProfileName] = useState(user?.displayName || "");
  const [profileChurch, setProfileChurch] = useState(user?.church || "");
  const [inviteDraft, setInviteDraft] = useState(inviteCode || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Privacy Passcode state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinStatus, setPinStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const fetchAvailableModels = React.useCallback(async (cfg: AppSettings) => {
    setLoadingModels(true);
    try {
      const res = await fetch("/api/ai/models", {
        headers: aiHeaders(cfg),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
        }
      }
    } catch {
      // Keep fallback
    } finally {
      setLoadingModels(false);
    }
  }, []);

  React.useEffect(() => {
    setDraft(settings);
    setTestResult(null);
    setProfileName(user?.displayName || "");
    setProfileChurch(user?.church || "");
    setInviteDraft(inviteCode || "");
    setProfileMsg(null);
    if (open && user?.role === "admin") {
      fetchAvailableModels(settings);
    }
  }, [settings, open, user?.id, inviteCode, fetchAvailableModels]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileName,
          church: profileChurch,
          ...(user.role === "admin" ? { inviteCode: inviteDraft } : {}),
        }),
      });
      const data = (await res.json()) as {
        user?: UserProfile;
        inviteCode?: string;
        error?: string;
      };
      if (res.ok && data.user) {
        onProfileUpdated?.(data.user, data.inviteCode);
        setProfileMsg("Profile saved!");
      } else {
        setProfileMsg(data.error || "Could not update profile.");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  if (!open) return null;

  const isAdmin = user?.role === "admin";

  const handleSave = () => {
    onUpdateSettings(draft);
    onClose();
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test-key", {
        method: "POST",
        headers: aiHeaders(draft),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: `Connected cleanly to ${data.model}!`,
        });
        fetchAvailableModels(draft);
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Could not verify key.",
        });
      }
    } catch {
      setTestResult({
        ok: false,
        message: "Network error while checking Gemini key.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSetPin = async () => {
    setPinBusy(true);
    setPinStatus(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          pin: newPin,
          currentPin: lockEnabled ? currentPin : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPinStatus({ ok: false, message: data.error || "Could not set passcode." });
      } else {
        setPinStatus({ ok: true, message: "Privacy passcode saved on Cloudflare!" });
        setCurrentPin("");
        setNewPin("");
        onLockChanged?.(true);
      }
    } catch {
      setPinStatus({ ok: false, message: "Network error saving passcode." });
    } finally {
      setPinBusy(false);
    }
  };

  const handleRemovePin = async () => {
    setPinBusy(true);
    setPinStatus(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          currentPin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPinStatus({
          ok: false,
          message: data.error || "Enter current passcode to remove lock.",
        });
      } else {
        setPinStatus({ ok: true, message: "Privacy passcode removed." });
        setCurrentPin("");
        setNewPin("");
        onLockChanged?.(false);
      }
    } catch {
      setPinStatus({ ok: false, message: "Network error removing passcode." });
    } finally {
      setPinBusy(false);
    }
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lamp-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DCCB] dark:border-[#2F2A24]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#F7EAD0] dark:bg-[#3A2D1B] flex items-center justify-center text-[#9A6B24] dark:text-[#DFB164]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold">Lamp Settings</h2>
              <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                {isAdmin
                  ? "Owner preferences, members & API settings"
                  : "Manage your profile, Bible translation & reading theme"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#6B635B] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* User Profile & Admin Members */}
          {user && (
            <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-9 w-9 rounded-full text-white font-semibold text-sm flex items-center justify-center shrink-0"
                    style={{ backgroundColor: user.avatarColor || "#9A6B24" }}
                  >
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {user.displayName}
                      {user.role === "admin" && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#F7EAD0] dark:bg-[#3A2D1B] text-[#7B531A] dark:text-[#DFB164] text-[10px] font-bold">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#6B635B] dark:text-[#A39A90] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3 py-1.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-rose-700 dark:text-rose-400 inline-flex items-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Display name"
                  className="rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                />
                <input
                  type="text"
                  value={profileChurch}
                  onChange={(e) => setProfileChurch(e.target.value)}
                  placeholder="Church / Small Group"
                  className="rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                />
              </div>

              {user.role === "admin" && (
                <div className="pt-2 border-t border-[#E6DCCB] dark:border-[#2A2520] space-y-2">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-[#574F47] dark:text-[#CFC5B9]">
                    <Users className="w-3.5 h-3.5 text-[#9A6B24]" />
                    Sign-Up Access ({members.length} registered{" "}
                    {members.length === 1 ? "profile" : "profiles"})
                  </label>
                  <input
                    type="text"
                    value={inviteDraft}
                    onChange={(e) => setInviteDraft(e.target.value)}
                    placeholder="Optional Invite Code (leave blank for open sign-up)"
                    className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                  />
                  {members.length > 0 && (
                    <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-[11px] text-[#6B635B] dark:text-[#A39A90]"
                        >
                          <span className="truncate font-medium text-[#1C1917] dark:text-[#EAE3D8]">
                            {m.displayName} ({m.email})
                          </span>
                          <span className="shrink-0 ml-2">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  {profileMsg || ""}
                </span>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-3 py-1.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          )}

          {/* Owner-Only API & Model Configuration */}
          {isAdmin && (
            <>
              {/* API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164]" />
                    Google Gemini API Key
                    {serverConfig?.hasServerGeminiKey && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Set on Cloudflare
                      </span>
                    )}
                  </label>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#9A6B24] dark:text-[#DFB164] hover:underline inline-flex items-center gap-1"
                  >
                    AI Studio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={draft.geminiApiKey}
                    onChange={(e) =>
                      setDraft({ ...draft, geminiApiKey: e.target.value })
                    }
                    placeholder="Optional local override (Cloudflare secret active)"
                    className="flex-1 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                  />
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={testing}
                    className="px-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] text-sm font-medium hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] transition inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </button>
                </div>
                {testResult && (
                  <div
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                      testResult.ok
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium block">Gemini Model</label>
                  <button
                    type="button"
                    onClick={() => fetchAvailableModels(draft)}
                    disabled={loadingModels}
                    className="text-xs text-[#9A6B24] dark:text-[#DFB164] hover:underline disabled:opacity-50"
                  >
                    {loadingModels ? "Loading models..." : "Refresh live models"}
                  </button>
                </div>
                <select
                  value={draft.geminiModel}
                  onChange={(e) =>
                    setDraft({ ...draft, geminiModel: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  {!models.some((m) => m.id === draft.geminiModel) && (
                    <option value={draft.geminiModel}>{draft.geminiModel}</option>
                  )}
                </select>
              </div>

              {/* ESV Bible API Token */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164]" />
                    ESV Bible API Token
                    {serverConfig?.hasServerEsvKey && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Set on Cloudflare
                      </span>
                    )}
                  </label>
                  <a
                    href="https://api.esv.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#9A6B24] dark:text-[#DFB164] hover:underline inline-flex items-center gap-1"
                  >
                    api.esv.org
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={draft.esvApiKey || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, esvApiKey: e.target.value })
                  }
                  placeholder="Optional local override (Cloudflare secret active)"
                  className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                />
              </div>
            </>
          )}

          {/* Bible Translation */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium block">
              Default Bible Translation
            </label>
            <select
              value={draft.defaultTranslation}
              onChange={(e) =>
                setDraft({ ...draft, defaultTranslation: e.target.value })
              }
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
            >
              {BIBLE_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium block">Reading Theme</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, theme: "light" })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition ${
                  draft.theme === "light"
                    ? "border-[#9A6B24] bg-[#F7EAD0]/60 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                    : "border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520]"
                }`}
              >
                <Sun className="w-4 h-4" />
                Parchment Light
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, theme: "dark" })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition ${
                  draft.theme === "dark"
                    ? "border-[#9A6B24] bg-[#F7EAD0]/60 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                    : "border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520]"
                }`}
              >
                <Moon className="w-4 h-4" />
                Candlelight Dark
              </button>
            </div>
          </div>

          {/* Privacy Passcode Lock (Owner only) */}
          {isAdmin && (
          <div className="pt-3 border-t border-[#E6DCCB] dark:border-[#2F2A24] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1.5">
                {lockEnabled ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164]" />
                )}
                Privacy Passcode Lock
              </label>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  lockEnabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-[#F2ECE1] text-[#6B635B] dark:bg-[#2A2520] dark:text-[#A39A90]"
                }`}
              >
                {lockEnabled ? "Active" : "Off"}
              </span>
            </div>
            <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
              Protect your personal sermon notes, prayers, and journal on your public Cloudflare URL with a passcode.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {lockEnabled && (
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="Current passcode"
                  className="flex-1 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                />
              )}
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder={lockEnabled ? "New passcode (4-12 chars)" : "Choose passcode (4-12 chars)"}
                className="flex-1 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
              />
              <button
                type="button"
                onClick={handleSetPin}
                disabled={pinBusy || newPin.trim().length < 4}
                className="px-3.5 py-2 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold disabled:opacity-45 transition"
              >
                {lockEnabled ? "Update" : "Enable Lock"}
              </button>
              {lockEnabled && (
                <button
                  type="button"
                  onClick={handleRemovePin}
                  disabled={pinBusy || !currentPin.trim()}
                  className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-45 transition"
                >
                  Remove
                </button>
              )}
            </div>
            {pinStatus && (
              <p
                className={`text-xs ${
                  pinStatus.ok
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {pinStatus.message}
              </p>
            )}
          </div>
          )}

          {/* Backup */}
          <div className="pt-2 border-t border-[#E6DCCB] dark:border-[#2F2A24] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Backup Study Library</p>
              <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                Export all {notes.length} notes as portable JSON
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] text-xs font-medium hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] transition inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-[#FAF7F2] dark:bg-[#171411] border-t border-[#E6DCCB] dark:border-[#2F2A24] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#6B635B] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#9A6B24] hover:bg-[#7B531A] text-white shadow-sm transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
