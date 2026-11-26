"use client";

import React, { useState } from "react";
import {
  Youtube,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import { AppSettings, StudyNote } from "@/lib/types";
import { aiHeaders } from "@/lib/client-api";

interface YouTubeSummarizerViewProps {
  settings: AppSettings;
  existingSeries?: string[];
  onNoteCreated: (note: StudyNote) => void;
  onOpenSettings: () => void;
}

interface PreviewMeta {
  videoId: string;
  canonicalUrl: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
}

export default function YouTubeSummarizerView({
  settings,
  existingSeries = [],
  onNoteCreated,
  onOpenSettings,
}: YouTubeSummarizerViewProps) {
  const [url, setUrl] = useState("");
  const [series, setSeries] = useState("");
  const [focusPrompt, setFocusPrompt] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [showManual, setShowManual] = useState(false);

  const [preview, setPreview] = useState<PreviewMeta | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async (rawUrl: string) => {
    if (!rawUrl.includes("youtu")) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/ai/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawUrl, previewOnly: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data.meta || null);
      } else {
        setPreview(null);
      }
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/youtube", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          url: url.trim(),
          series: series.trim() || undefined,
          focusPrompt: focusPrompt.trim() || undefined,
          manualTranscript: manualTranscript.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not summarize YouTube sermon.");
      }
      onNoteCreated(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize video.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A6B24] dark:text-[#DFB164]">
          Online Teaching Digest
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
          YouTube Sermon Summarizer
        </h1>
        <p className="text-sm text-[#6B635B] dark:text-[#A39A90] mt-1">
          Missed Sunday service or watching a Bible lecture online? Paste any YouTube link to generate a full structured study guide with clickable scripture links.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            {error.toLowerCase().includes("api key") && (
              <button
                onClick={onOpenSettings}
                className="mt-2 text-xs font-semibold underline"
              >
                Open Settings to add your free Gemini API key →
              </button>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSummarize}
        className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-8 shadow-sm space-y-5"
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] block mb-2">
            YouTube Sermon or Bible Study URL
          </label>
          <div className="relative">
            <Link2 className="w-4 h-4 text-[#8C8278] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value.trim().length > 15) {
                  fetchPreview(e.target.value.trim());
                } else {
                  setPreview(null);
                }
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
            />
          </div>
        </div>

        {/* Live Video Preview */}
        {loadingPreview && (
          <div className="h-24 rounded-2xl bg-[#F2ECE1]/70 dark:bg-[#141210] animate-pulse" />
        )}

        {preview && !loadingPreview && (
          <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5 flex items-center gap-4">
            {preview.thumbnailUrl && (
              <img
                src={preview.thumbnailUrl}
                alt={preview.title || "Video thumbnail"}
                className="w-28 h-20 object-cover rounded-xl shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1">
                <Youtube className="w-3.5 h-3.5" />
                Video Ready
              </div>
              <p className="font-serif text-base font-semibold line-clamp-2">
                {preview.title || "YouTube Sermon"}
              </p>
              {preview.author && (
                <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-0.5">
                  {preview.author}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1.5">
              Series / Folder (optional)
            </label>
            <input
              type="text"
              list="yt-series-suggestions"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="e.g. Gospel of John"
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
            {existingSeries.length > 0 && (
              <datalist id="yt-series-suggestions">
                {existingSeries.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1.5">
              Optional Study Focus
            </label>
            <input
              type="text"
              value={focusPrompt}
              onChange={(e) => setFocusPrompt(e.target.value)}
              placeholder="e.g. Small-group discussion questions"
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>
        </div>

        {/* Optional Manual Transcript Fallback */}
        <div className="border-t border-[#EFE8DC] dark:border-[#2A2520] pt-3">
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B635B] dark:text-[#A39A90] hover:text-[#1C1917] dark:hover:text-[#F5F0E8]"
          >
            {showManual ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Optional: Paste transcript manually (if video has private captions)
          </button>
          {showManual && (
            <textarea
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              rows={5}
              placeholder="Paste the sermon transcript here..."
              className="mt-2.5 w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] p-3.5 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={generating || !url.trim()}
          className="w-full py-3.5 rounded-2xl bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-45"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Sermon & Extracting Scripture...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Structured Sermon Notes
            </>
          )}
        </button>
      </form>

      {/* Helpful info strip */}
      <div className="grid sm:grid-cols-3 gap-3 text-xs text-[#6B635B] dark:text-[#A39A90]">
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-4">
          <p className="font-semibold text-[#1C1917] dark:text-[#F5F0E8] mb-1">
            Structured Outline
          </p>
          Breaks hour-long messages into clear points and themes.
        </div>
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-4">
          <p className="font-semibold text-[#1C1917] dark:text-[#F5F0E8] mb-1">
            Linked Scripture
          </p>
          Every Bible verse cited becomes a tap-to-read link.
        </div>
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-4">
          <p className="font-semibold text-[#1C1917] dark:text-[#F5F0E8] mb-1">
            Weekly Takeaways
          </p>
          Distills practical reflection questions and checkable steps.
        </div>
      </div>
    </div>
  );
}
