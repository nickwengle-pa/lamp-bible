"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  Sparkles,
  Loader2,
  Clock,
  Trash2,
  AlertCircle,
  BookmarkPlus,
} from "lucide-react";
import { AppSettings, StudyNote } from "@/lib/types";
import { aiHeaders, formatDuration } from "@/lib/client-api";

interface SermonRecorderViewProps {
  settings: AppSettings;
  onNoteCreated: (note: StudyNote) => void;
  onOpenSettings: () => void;
}

export default function SermonRecorderView({
  settings,
  onNoteCreated,
  onOpenSettings,
}: SermonRecorderViewProps) {
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [church, setChurch] = useState("");
  const [rawNotes, setRawNotes] = useState("");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(new Array(24).fill(12));

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudioResources();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const cleanupAudioResources = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup live waveform visualizer
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i % dataArray.length] || 0;
          bars.push(Math.max(10, Math.min(100, Math.round((val / 255) * 100))));
        }
        setLevels(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setAudioFileName(`Live Recording (${formatDuration(seconds) || "clip"})`);
        cleanupAudioResources();
        setLevels(new Array(24).fill(12));
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setError(
        "Microphone permission was denied or unavailable. You can still upload an audio file or type your live sermon notes below."
      );
    }
  };

  const togglePause = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (isPaused) {
      rec.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      rec.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("Audio file is larger than 25 MB. Please trim or compress it first.");
      return;
    }
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioFileName(file.name);
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioFileName(null);
    setSeconds(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const insertTimestamp = () => {
    const stamp = `[${formatDuration(seconds) || "0:00"}] `;
    setRawNotes((prev) => (prev ? `${prev}\n${stamp}` : stamp));
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleGenerate = async () => {
    if (!audioBlob && !rawNotes.trim()) {
      setError("Record or upload sermon audio, or jot down some notes first.");
      return;
    }
    if (isRecording) {
      stopRecording();
      setError("Stopped recording — click 'Structure with Vessel AI' again to process.");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      let audioBase64: string | undefined;
      let audioMimeType: string | undefined;

      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
        // Strip codec suffix for Gemini mimeType compatibility (e.g., audio/webm)
        audioMimeType = (audioBlob.type || "audio/webm").split(";")[0];
      }

      const res = await fetch("/api/ai/sermon", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          title,
          speaker,
          church,
          rawNotes,
          audioBase64,
          audioMimeType,
          durationSeconds: seconds || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to structure sermon notes.");
      }

      onNoteCreated(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A6B24] dark:text-[#DFB164]">
          Live Capture Studio
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
          Sermon Recorder & Notes
        </h1>
        <p className="text-sm text-[#6B635B] dark:text-[#A39A90] mt-1">
          Record live audio while jotting thoughts — Vessel turns both into organized themes, scripture references, and actionable takeaways.
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

      {/* Recorder Console Card */}
      <div className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          {/* Timer */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] text-xs font-mono font-semibold text-[#574F47] dark:text-[#D5CBC0] mb-5">
            <span
              className={`h-2 w-2 rounded-full ${
                isRecording && !isPaused
                  ? "bg-rose-500 animate-pulse"
                  : isPaused
                  ? "bg-amber-500"
                  : "bg-[#B88435]/50"
              }`}
            />
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(seconds) || "0:00"}</span>
            {isRecording && (
              <span className="text-[11px] font-sans uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {isPaused ? "Paused" : "Live"}
              </span>
            )}
          </div>

          {/* Live Waveform */}
          <div className="h-14 flex items-center justify-center gap-1.5 w-full max-w-md mb-6">
            {levels.map((lvl, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-100 ${
                  isRecording && !isPaused
                    ? "bg-[#9A6B24] dark:bg-[#DFB164]"
                    : "bg-[#DFD5C5] dark:bg-[#342E28]"
                }`}
                style={{ height: `${Math.max(12, lvl)}%` }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <>
                <button
                  onClick={startRecording}
                  className="relative px-6 py-3.5 rounded-2xl bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-md inline-flex items-center gap-2.5 transition"
                >
                  <Mic className="w-5 h-5" />
                  {audioBlob ? "Record New Clip" : "Start Live Recording"}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-3.5 rounded-2xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-sm font-medium inline-flex items-center gap-2 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Audio
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadAudio}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="px-5 py-3 rounded-2xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-sm font-medium inline-flex items-center gap-2 transition"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  )}
                </button>

                <button
                  onClick={stopRecording}
                  className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md inline-flex items-center gap-2 transition"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Finish Recording
                </button>
              </>
            )}
          </div>

          {/* Audio Playback Preview */}
          {audioUrl && !isRecording && (
            <div className="mt-6 w-full max-w-lg rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full text-left">
                <p className="text-xs font-medium text-[#574F47] dark:text-[#C9BFB3] truncate mb-1.5">
                  {audioFileName}
                </p>
                <audio controls src={audioUrl} className="w-full h-8" />
              </div>
              <button
                onClick={clearAudio}
                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Remove audio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata + Live Notes Scratchpad */}
      <div className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 space-y-4 shadow-sm">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
              Sermon Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Walking in Peace"
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
              Pastor / Speaker (optional)
            </label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="e.g. Pastor David"
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
              Church / Group (optional)
            </label>
            <input
              type="text"
              value={church}
              onChange={(e) => setChurch(e.target.value)}
              placeholder="e.g. Grace Community"
              className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90]">
              Live Notes & Thoughts
            </label>
            <button
              type="button"
              onClick={insertTimestamp}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9A6B24] dark:text-[#DFB164] hover:underline"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Drop Timestamp ({formatDuration(seconds) || "0:00"})
            </button>
          </div>
          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            rows={7}
            placeholder="Jot down verses mentioned, quotes that stood out, or rough bullet points as you listen. Vessel AI will blend your personal notes with the audio into a polished study guide..."
            className="w-full rounded-2xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
            Works with audio + notes together, audio only, or rough notes only.
          </p>
          <button
            onClick={handleGenerate}
            disabled={processing || (!audioBlob && !rawNotes.trim())}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#1C1917] hover:bg-[#322C27] dark:bg-[#DFB164] dark:hover:bg-[#CCA052] text-white dark:text-[#141210] font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-45"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Structuring with Vessel AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Structure with Vessel AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
