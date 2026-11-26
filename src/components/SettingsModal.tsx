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
} from "lucide-react";
import { AppSettings, StudyNote } from "@/lib/types";
import { BIBLE_TRANSLATIONS } from "@/lib/bible-books";
import { aiHeaders } from "@/lib/client-api";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  notes: StudyNote[];
}

const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recommended — Fast & Free Tier)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Deeper Theological Analysis)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Lightweight)" },
];

export default function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  notes,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    setDraft(settings);
    setTestResult(null);
  }, [settings, open]);

  if (!open) return null;

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

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vessel-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
              <h2 className="font-serif text-xl font-semibold">Vessel Settings</h2>
              <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                100% private — your key stays in your browser
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
          {/* API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164]" />
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#9A6B24] dark:text-[#DFB164] hover:underline inline-flex items-center gap-1"
              >
                Get free key at AI Studio
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
                placeholder="AIzaSy..."
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
            <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
              Powers sermon transcription, YouTube summaries, verse insights, and camera scanning. You can also set{" "}
              <code className="px-1 py-0.5 rounded bg-[#F2ECE1] dark:bg-[#2A2520]">
                GEMINI_API_KEY
              </code>{" "}
              in <code className="px-1 py-0.5 rounded bg-[#F2ECE1] dark:bg-[#2A2520]">.env.local</code>.
            </p>
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
            <label className="text-sm font-medium block">Gemini Model</label>
            <select
              value={draft.geminiModel}
              onChange={(e) =>
                setDraft({ ...draft, geminiModel: e.target.value })
              }
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

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
