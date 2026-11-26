"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  BookOpen,
  BookmarkPlus,
  AlertCircle,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { AppSettings, ScanResult, StudyNote } from "@/lib/types";
import { aiHeaders } from "@/lib/client-api";

interface ScriptureScannerViewProps {
  settings: AppSettings;
  onOpenScripture: (reference: string) => void;
  onSaveScanNote: (note: Partial<StudyNote>) => Promise<StudyNote | null>;
  onOpenSettings: () => void;
}

export default function ScriptureScannerView({
  settings,
  onOpenScripture,
  onSaveScanNote,
  onOpenSettings,
}: ScriptureScannerViewProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [focusHint, setFocusHint] = useState("");

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    setResult(null);
    setPreviewDataUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Wait for video element to mount
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError(
        "Camera access was unavailable or blocked. Use 'Upload Bible Photo' to select a picture from your phone or computer."
      );
    }
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const maxW = 1400;
    const scale = Math.min(1, maxW / (video.videoWidth || 1280));
    canvas.width = Math.round((video.videoWidth || 1280) * scale);
    canvas.height = Math.round((video.videoHeight || 720) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreviewDataUrl(dataUrl);
    setImageBase64(dataUrl.split(",")[1] || null);
    setImageMime("image/jpeg");
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    stopCamera();
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreviewDataUrl(dataUrl);
      setImageBase64(dataUrl.split(",")[1] || null);
      setImageMime(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imageBase64) return;
    setScanning(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ai/scan-scripture", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMime,
          focusHint: focusHint.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { result?: ScanResult; error?: string };
      if (!res.ok || !data.result) {
        throw new Error(data.error || "Failed to recognize scripture page.");
      }
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!result) return;
    const created = await onSaveScanNote({
      title: `Scanned Passage: ${result.detectedReference}`,
      sourceType: "scan",
      tags: [result.book, `Chapter ${result.chapter}`, "Scanned"],
      summary: result.summary,
      keyThemes: result.keyThemes,
      outline: [
        {
          heading: "Historical & Literary Background",
          points: [result.historicalContext],
        },
        {
          heading: "Scanned Passage Text",
          points: [result.transcribedText],
        },
      ],
      scriptureReferences: [
        {
          reference: result.detectedReference,
          context: "Captured from printed Bible page",
        },
      ],
      actionableTakeaways: result.actionableTakeaways.map((text, i) => ({
        id: `scan-act-${Date.now()}-${i}`,
        text,
        completed: false,
      })),
      reflectionQuestions: result.reflectionQuestions,
      personalNotes: "",
    });
    if (created) setSaved(true);
  };

  const resetAll = () => {
    stopCamera();
    setPreviewDataUrl(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A6B24] dark:text-[#DFB164]">
          Optical Passage Lookup
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
          Instant Scripture Scanner
        </h1>
        <p className="text-sm text-[#6B635B] dark:text-[#A39A90] mt-1">
          Point your camera at a printed Bible page or upload a photo — Lamp identifies the exact passage, opens it in the Bible Reader, and unpacks its context.
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

      {/* Scanner Surface */}
      <div className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-8 shadow-sm space-y-5">
        {!cameraActive && !previewDataUrl && (
          <div className="rounded-2xl border-2 border-dashed border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] py-14 px-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-[#F7EAD0] dark:bg-[#33281A] flex items-center justify-center text-[#9A6B24] dark:text-[#DFB164] mb-4">
              <Camera className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-xl font-semibold">
              Scan a Printed Bible Page
            </h2>
            <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-1 max-w-sm mx-auto">
              Works with physical study Bibles, devotional books, church bulletins, or screenshots of verses.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={startCamera}
                className="px-5 py-3 rounded-2xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-sm font-semibold shadow-sm inline-flex items-center gap-2 transition"
              >
                <Camera className="w-4 h-4" />
                Open Live Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-3 rounded-2xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-sm font-medium inline-flex items-center gap-2 transition"
              >
                <Upload className="w-4 h-4" />
                Upload Bible Photo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Live Camera Viewfinder */}
        {cameraActive && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] max-h-[440px] mx-auto">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viewfinder framing guide */}
              <div className="pointer-events-none absolute inset-6 border-2 border-[#DFB164]/70 rounded-xl" />
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <button
                onClick={captureSnapshot}
                className="px-7 py-3.5 rounded-full bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-lg inline-flex items-center gap-2 transition"
              >
                <Camera className="w-5 h-5" />
                Capture Page
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Preview + Scan Action */}
        {previewDataUrl && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-[#E6DCCB] dark:border-[#2F2A24] bg-black/5 max-h-[380px] flex justify-center">
              <img
                src={previewDataUrl}
                alt="Captured Bible page"
                className="max-h-[380px] object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={focusHint}
                onChange={(e) => setFocusHint(e.target.value)}
                placeholder="Optional hint (e.g., 'Focus on the highlighted verse')"
                className="flex-1 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
              />
              <button
                onClick={resetAll}
                className="px-4 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] transition"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="px-6 py-2.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reading Passage...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Scan Scripture
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scan Result Card */}
      {result && (
        <div className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#DFC9A3] dark:border-[#4A3A22] p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE8DC] dark:border-[#2A2520]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Passage Recognized
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-0.5">
                {result.detectedReference}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onOpenScripture(result.detectedReference)}
                className="px-4 py-2.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <BookOpen className="w-4 h-4" />
                Open in Bible Reader
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={saved}
                className="px-4 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-60"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Saved to Library
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    Save Study Note
                  </>
                )}
              </button>
            </div>
          </div>

          <blockquote className="font-serif text-lg leading-relaxed pl-4 border-l-2 border-[#B88435] text-[#2C2723] dark:text-[#EAE3D8]">
            {result.transcribedText}
          </blockquote>

          <div className="grid md:grid-cols-2 gap-5 text-sm">
            <div className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#EBE2D3] dark:border-[#2C2721]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-1.5">
                Summary
              </h3>
              <p className="leading-relaxed text-[#3F3A35] dark:text-[#D5CDC2]">
                {result.summary}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#EBE2D3] dark:border-[#2C2721]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-1.5">
                Historical Background
              </h3>
              <p className="leading-relaxed text-[#3F3A35] dark:text-[#D5CDC2]">
                {result.historicalContext}
              </p>
            </div>
          </div>

          {result.actionableTakeaways.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-2">
                Actionable Takeaways
              </h3>
              <ul className="space-y-1.5 text-sm text-[#3F3A35] dark:text-[#D5CDC2]">
                {result.actionableTakeaways.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#9A6B24] font-bold">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
