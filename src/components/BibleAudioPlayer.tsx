"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  Headphones,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  AppSettings,
  AudioBibleTrack,
  BibleAudioResponse,
  BibleVerse,
} from "@/lib/types";
import { bibleHeaders } from "@/lib/client-api";

const AUDIO_PREFS_KEY = "lamp_audio_bible_prefs_v1";
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

interface StoredAudioPrefs {
  rate: number;
  autoAdvance: boolean;
  bsbNarrator: string;
}

function loadAudioPrefs(): StoredAudioPrefs {
  const fallback: StoredAudioPrefs = {
    rate: 1,
    autoAdvance: true,
    bsbNarrator: "hays",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredAudioPrefs>;
    const rate =
      typeof parsed.rate === "number" &&
      PLAYBACK_RATES.includes(parsed.rate as (typeof PLAYBACK_RATES)[number])
        ? parsed.rate
        : 1;
    return {
      rate,
      autoAdvance:
        typeof parsed.autoAdvance === "boolean" ? parsed.autoAdvance : true,
      bsbNarrator:
        typeof parsed.bsbNarrator === "string" && parsed.bsbNarrator.trim()
          ? parsed.bsbNarrator.trim()
          : "hays",
    };
  } catch {
    return fallback;
  }
}

function saveAudioPrefs(prefs: StoredAudioPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota failures
  }
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

function pickBestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const ranked = [...pool].sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) => {
      let s = 0;
      const name = v.name.toLowerCase();
      if (v.lang.toLowerCase() === "en-us") s += 10;
      if (name.includes("natural") || name.includes("neural")) s += 30;
      if (name.includes("samantha") || name.includes("ava") || name.includes("allison")) s += 20;
      if (name.includes("aria") || name.includes("jenny") || name.includes("guy")) s += 18;
      if (name.includes("google us english")) s += 16;
      if (v.default) s += 5;
      return s;
    };
    return score(b) - score(a);
  });
  return ranked[0] || null;
}

interface BibleAudioPlayerProps {
  book: string;
  chapter: number;
  translation: string;
  verses: BibleVerse[];
  loadingChapter: boolean;
  settings: AppSettings;
  hasNextChapter: boolean;
  hasPrevChapter: boolean;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  onSelectTranslation: (trans: string) => void;
  onSpeakingVerseChange: (verse: number | null) => void;
  onPlayingChange?: (playing: boolean) => void;
  onClose: () => void;
  autoStartToken: number;
}

export default function BibleAudioPlayer({
  book,
  chapter,
  translation,
  verses,
  loadingChapter,
  settings,
  hasNextChapter,
  hasPrevChapter,
  onNextChapter,
  onPrevChapter,
  onSelectTranslation,
  onSpeakingVerseChange,
  onPlayingChange,
  onClose,
  autoStartToken,
}: BibleAudioPlayerProps) {
  const [prefs, setPrefs] = useState<StoredAudioPrefs>(() => loadAudioPrefs());
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [audioMeta, setAudioMeta] = useState<BibleAudioResponse | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [forceTts, setForceTts] = useState(false);

  // Studio MP3 state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Device Read-Aloud (Web Speech API) state
  const [ttsSupported, setTtsSupported] = useState(true);
  const [ttsVerseIdx, setTtsVerseIdx] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Coordination refs
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const wantAutoPlayRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const ttsSessionRef = useRef(0);
  const lastAutoStartTokenRef = useRef(0);

  // Keep latest callbacks in refs so audio/TTS event handlers never read stale closures
  const autoAdvanceRef = useRef(prefs.autoAdvance);
  autoAdvanceRef.current = prefs.autoAdvance;
  const hasNextRef = useRef(hasNextChapter);
  hasNextRef.current = hasNextChapter;
  const hasPrevRef = useRef(hasPrevChapter);
  hasPrevRef.current = hasPrevChapter;
  const onNextRef = useRef(onNextChapter);
  onNextRef.current = onNextChapter;
  const onPrevRef = useRef(onPrevChapter);
  onPrevRef.current = onPrevChapter;
  const rateRef = useRef(prefs.rate);
  rateRef.current = prefs.rate;
  const bsbNarratorRef = useRef(prefs.bsbNarrator);
  bsbNarratorRef.current = prefs.bsbNarrator;
  const versesRef = useRef(verses);
  versesRef.current = verses;
  const onSpeakingVerseChangeRef = useRef(onSpeakingVerseChange);
  onSpeakingVerseChangeRef.current = onSpeakingVerseChange;

  const studioTracks = audioMeta?.available ? audioMeta.tracks : [];
  const activeTrack: AudioBibleTrack | null = useMemo(() => {
    if (!studioTracks.length) return null;
    return (
      studioTracks.find((t) => t.id === selectedTrackId) || studioTracks[0]
    );
  }, [studioTracks, selectedTrackId]);

  const mode: "studio" | "tts" =
    !forceTts && activeTrack ? "studio" : "tts";

  const updatePrefs = useCallback((patch: Partial<StoredAudioPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveAudioPrefs(next);
      return next;
    });
  }, []);

  // Notify parent of playing state
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Discover SpeechSynthesis voices once
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsSupported(false);
      return;
    }
    const syncVoices = () => {
      try {
        setVoices(window.speechSynthesis.getVoices());
      } catch {
        // ignore
      }
    };
    syncVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", syncVoices);
    };
  }, []);

  const stopTts = useCallback(() => {
    ttsSessionRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    onSpeakingVerseChangeRef.current(null);
  }, []);

  const stopStudioAudio = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
    }
  }, []);

  // Trigger autoplay whenever Listen button bumps autoStartToken
  useEffect(() => {
    if (autoStartToken > 0 && autoStartToken !== lastAutoStartTokenRef.current) {
      lastAutoStartTokenRef.current = autoStartToken;
      wantAutoPlayRef.current = true;
    }
  }, [autoStartToken]);

  // Speak chapter verse-by-verse via Device Read-Aloud
  const startTtsFrom = useCallback(
    (startIndex: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setAudioError("Device Read-Aloud is not supported in this browser.");
        setIsPlaying(false);
        return;
      }
      const list = versesRef.current;
      if (!list.length) return;

      const clamped = Math.max(0, Math.min(list.length - 1, startIndex));
      stopStudioAudio();
      ttsSessionRef.current += 1;
      const mySession = ttsSessionRef.current;

      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }

      const preferredVoice = pickBestEnglishVoice(
        voices.length ? voices : window.speechSynthesis.getVoices()
      );

      setAudioError(null);
      setIsPlaying(true);

      const speakAt = (idx: number) => {
        if (ttsSessionRef.current !== mySession) return;
        const currentList = versesRef.current;
        if (idx >= currentList.length) {
          setIsPlaying(false);
          onSpeakingVerseChangeRef.current(null);
          if (autoAdvanceRef.current && hasNextRef.current) {
            wantAutoPlayRef.current = true;
            onNextRef.current();
          }
          return;
        }

        const v = currentList[idx];
        setTtsVerseIdx(idx);
        onSpeakingVerseChangeRef.current(v.verse);

        const cleanText = v.text.replace(/\s+/g, " ").trim();
        if (!cleanText) {
          speakAt(idx + 1);
          return;
        }

        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = preferredVoice?.lang || "en-US";
        if (preferredVoice) utter.voice = preferredVoice;
        utter.rate = rateRef.current;
        utter.onend = () => {
          if (ttsSessionRef.current !== mySession) return;
          speakAt(idx + 1);
        };
        utter.onerror = (ev) => {
          if (ttsSessionRef.current !== mySession) return;
          if (ev.error === "canceled" || ev.error === "interrupted") return;
          setIsPlaying(false);
          onSpeakingVerseChangeRef.current(null);
          setAudioError("Device Read-Aloud paused. Tap Play to try again.");
        };

        try {
          window.speechSynthesis.speak(utter);
        } catch {
          setIsPlaying(false);
          onSpeakingVerseChangeRef.current(null);
        }
      };

      speakAt(clamped);
    },
    [stopStudioAudio, voices]
  );

  // Load audio metadata whenever book, chapter, or translation changes
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    stopTts();
    stopStudioAudio();
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setTtsVerseIdx(0);
    setAudioError(null);
    setForceTts(false);
    setAudioMeta(null);
    setSelectedTrackId("");
    setLoadingMeta(true);

    const fetchMeta = async () => {
      try {
        const res = await fetch(
          `/api/bible/audio?passage=${encodeURIComponent(
            `${book} ${chapter}`
          )}&translation=${encodeURIComponent(translation)}`,
          {
            headers: bibleHeaders(settings),
            signal: controller.signal,
          }
        );
        const data = (await res.json()) as BibleAudioResponse & {
          error?: string;
        };
        if (reqId !== reqIdRef.current) return;
        if (!res.ok) {
          setAudioMeta({
            available: false,
            reference: `${book} ${chapter}`,
            translation,
            tracks: [],
            reason:
              data.error ||
              "Studio audio is unavailable right now — using Device Read-Aloud.",
          });
          setSelectedTrackId("");
          return;
        }
        setAudioMeta(data);
        if (data.available && data.tracks.length > 0) {
          const savedPreferred =
            translation === "bsb"
              ? data.tracks.find((t) => t.id === bsbNarratorRef.current)
              : undefined;
          setSelectedTrackId((savedPreferred || data.tracks[0]).id);
        } else {
          setSelectedTrackId("");
        }
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAudioMeta({
          available: false,
          reference: `${book} ${chapter}`,
          translation,
          tracks: [],
          reason:
            "Could not reach studio audio right now — using Device Read-Aloud.",
        });
        setSelectedTrackId("");
      } finally {
        if (reqId === reqIdRef.current) {
          setLoadingMeta(false);
        }
      }
    };

    fetchMeta();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter, translation, settings.esvApiKey]);

  // Apply playbackRate to <audio> element whenever rate or active track changes
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.playbackRate = prefs.rate;
    }
  }, [prefs.rate, activeTrack?.url]);

  // Load new studio track URL into <audio> element & handle autoplay / narrator-switch resume
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (mode !== "studio" || !activeTrack?.url) {
      el.pause();
      if (el.getAttribute("src")) {
        el.removeAttribute("src");
        el.load();
      }
      return;
    }

    stopTts();
    setAudioError(null);
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(0);

    el.src = activeTrack.url;
    el.playbackRate = rateRef.current;
    el.load();

    if (wantAutoPlayRef.current) {
      wantAutoPlayRef.current = false;
      el.play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          // Autoplay blocked by browser policy until user taps Play directly
          setIsPlaying(false);
          setIsBuffering(false);
        });
    }
  }, [mode, activeTrack?.url, stopTts]);

  // Auto-start Device Read-Aloud when metadata resolves to TTS and verses are ready
  useEffect(() => {
    if (
      !loadingMeta &&
      !loadingChapter &&
      mode === "tts" &&
      verses.length > 0 &&
      wantAutoPlayRef.current
    ) {
      wantAutoPlayRef.current = false;
      startTtsFrom(0);
    }
  }, [loadingMeta, loadingChapter, mode, verses.length, startTtsFrom]);

  // Media Session API for lock-screen / headset controls during studio playback
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    if (mode !== "studio" || !activeTrack) {
      try {
        navigator.mediaSession.playbackState = "none";
      } catch {
        // ignore
      }
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${book} ${chapter} (${translation.toUpperCase()})`,
        artist: activeTrack.narrator,
        album: "Lamp Audio Bible",
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        const el = audioRef.current;
        if (el) el.currentTime = Math.max(0, el.currentTime - 15);
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        const el = audioRef.current;
        if (el) {
          const cap = Number.isFinite(el.duration) ? el.duration : el.currentTime + 15;
          el.currentTime = Math.min(cap, el.currentTime + 15);
        }
      });
      navigator.mediaSession.setActionHandler(
        "nexttrack",
        hasNextChapter
          ? () => {
              wantAutoPlayRef.current = true;
              onNextRef.current();
            }
          : null
      );
      navigator.mediaSession.setActionHandler(
        "previoustrack",
        hasPrevChapter
          ? () => {
              wantAutoPlayRef.current = true;
              onPrevRef.current();
            }
          : null
      );
    } catch {
      // ignore unsupported MediaSession properties
    }
  }, [mode, activeTrack, book, chapter, translation, isPlaying, hasNextChapter, hasPrevChapter]);

  // Clean up everything on unmount
  useEffect(() => {
    const el = audioRef.current;
    return () => {
      abortRef.current?.abort();
      stopTts();
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
      onPlayingChange?.(false);
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        try {
          navigator.mediaSession.playbackState = "none";
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTogglePlay = () => {
    if (mode === "studio") {
      const el = audioRef.current;
      if (!el || !activeTrack) return;
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
      } else {
        setAudioError(null);
        el.playbackRate = prefs.rate;
        el.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setAudioError(
              "Could not start studio audio. Tap Device Voice to listen aloud."
            );
            setIsPlaying(false);
          });
      }
      return;
    }

    // Device Read-Aloud toggle
    if (isPlaying) {
      stopTts();
      setIsPlaying(false);
    } else {
      startTtsFrom(ttsVerseIdx);
    }
  };

  const handleSeekStudio = (nextTime: number) => {
    const el = audioRef.current;
    if (!el) return;
    const max = Number.isFinite(el.duration) ? el.duration : duration;
    const clamped = Math.max(0, Math.min(max || 0, nextTime));
    el.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleSkipSeconds = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    handleSeekStudio(el.currentTime + delta);
  };

  const handleStepTtsVerse = (delta: number) => {
    if (!verses.length) return;
    const nextIdx = Math.max(0, Math.min(verses.length - 1, ttsVerseIdx + delta));
    setTtsVerseIdx(nextIdx);
    if (isPlaying) {
      startTtsFrom(nextIdx);
    } else {
      onSpeakingVerseChange(verses[nextIdx]?.verse ?? null);
    }
  };

  const handleCycleRate = () => {
    const idx = PLAYBACK_RATES.indexOf(
      prefs.rate as (typeof PLAYBACK_RATES)[number]
    );
    const nextRate = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    updatePrefs({ rate: nextRate });
    rateRef.current = nextRate;
    if (mode === "studio" && audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    } else if (mode === "tts" && isPlaying) {
      // Restart current verse seamlessly at the new speed
      startTtsFrom(ttsVerseIdx);
    }
  };

  const handleChangeNarrator = (nextId: string) => {
    if (nextId === selectedTrackId) return;
    const wasPlaying = isPlaying;
    const resumeAt = audioRef.current?.currentTime || 0;
    pendingSeekRef.current = resumeAt > 1 ? resumeAt : null;
    wantAutoPlayRef.current = wasPlaying;
    setSelectedTrackId(nextId);
    if (translation === "bsb") {
      updatePrefs({ bsbNarrator: nextId });
    }
  };

  const handleSwitchMode = (nextForceTts: boolean) => {
    if (nextForceTts === forceTts) return;
    stopTts();
    stopStudioAudio();
    setIsPlaying(false);
    setAudioError(null);
    setForceTts(nextForceTts);
  };

  const handleSwitchStudioTranslation = (nextTrans: string) => {
    wantAutoPlayRef.current = true;
    onSelectTranslation(nextTrans);
  };

  const currentVerseNumber = verses[ttsVerseIdx]?.verse ?? 1;
  const maxVerseNumber = verses[verses.length - 1]?.verse ?? verses.length;

  return (
    <div
      role="region"
      aria-label={`Audio Bible player for ${book} ${chapter}`}
      className="mt-2.5 rounded-2xl bg-[#FAF4E8]/95 dark:bg-[#211B14]/95 border border-[#DFC9A3] dark:border-[#4A3A22] shadow-md px-3 sm:px-4 py-2.5 space-y-2"
    >
      {/* Hidden native HTML5 audio element for Studio MP3 playback */}
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration)) {
            setDuration(el.duration);
          }
          if (pendingSeekRef.current !== null) {
            const target = Math.min(
              pendingSeekRef.current,
              Number.isFinite(el.duration) ? Math.max(0, el.duration - 1) : pendingSeekRef.current
            );
            el.currentTime = target;
            setCurrentTime(target);
            pendingSeekRef.current = null;
          }
          setIsBuffering(false);
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (autoAdvanceRef.current && hasNextRef.current) {
            wantAutoPlayRef.current = true;
            onNextRef.current();
          }
        }}
        onError={() => {
          if (mode !== "studio" || !activeTrack?.url) return;
          setIsPlaying(false);
          setIsBuffering(false);
          setAudioError(
            "Studio audio couldn't load for this chapter — you can switch to Device Read-Aloud."
          );
        }}
      />

      {/* Row 1: Primary Transport + Scrubber + Close */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Skip Back */}
        <button
          type="button"
          onClick={() =>
            mode === "studio" ? handleSkipSeconds(-15) : handleStepTtsVerse(-1)
          }
          disabled={loadingMeta || (mode === "tts" && ttsVerseIdx <= 0)}
          aria-label={mode === "studio" ? "Rewind 15 seconds" : "Previous verse"}
          title={mode === "studio" ? "Back 15s" : "Previous verse"}
          className="p-1.5 rounded-xl text-[#6B5B46] dark:text-[#C5B39B] hover:bg-[#EFE4D0] dark:hover:bg-[#31271C] disabled:opacity-35 transition shrink-0 flex items-center gap-0.5"
        >
          {mode === "studio" ? (
            <>
              <RotateCcw className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden sm:inline">15</span>
            </>
          ) : (
            <SkipBack className="w-4 h-4" />
          )}
        </button>

        {/* Primary Play / Pause */}
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={
            loadingMeta ||
            (mode === "tts" && (loadingChapter || !verses.length || !ttsSupported))
          }
          aria-label={isPlaying ? "Pause audio Bible" : "Play audio Bible"}
          className="w-9 h-9 rounded-full bg-[#9A6B24] hover:bg-[#7B531A] dark:bg-[#DFB164] dark:hover:bg-[#E7C07D] text-white dark:text-[#141210] flex items-center justify-center shadow-sm disabled:opacity-50 transition shrink-0 active:scale-95"
        >
          {loadingMeta || (mode === "studio" && isBuffering && isPlaying) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Skip Forward */}
        <button
          type="button"
          onClick={() =>
            mode === "studio" ? handleSkipSeconds(15) : handleStepTtsVerse(1)
          }
          disabled={
            loadingMeta ||
            (mode === "tts" && ttsVerseIdx >= Math.max(0, verses.length - 1))
          }
          aria-label={mode === "studio" ? "Forward 15 seconds" : "Next verse"}
          title={mode === "studio" ? "Forward 15s" : "Next verse"}
          className="p-1.5 rounded-xl text-[#6B5B46] dark:text-[#C5B39B] hover:bg-[#EFE4D0] dark:hover:bg-[#31271C] disabled:opacity-35 transition shrink-0 flex items-center gap-0.5"
        >
          {mode === "studio" ? (
            <>
              <RotateCw className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden sm:inline">15</span>
            </>
          ) : (
            <SkipForward className="w-4 h-4" />
          )}
        </button>

        {/* Scrub Bar + Time / Verse Progress */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {mode === "studio" ? (
            <>
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.5}
                value={duration > 0 ? Math.min(currentTime, duration) : 0}
                onChange={(e) => handleSeekStudio(Number(e.target.value))}
                disabled={!duration}
                aria-label="Audio chapter timeline"
                className="w-full h-1.5 accent-[#9A6B24] dark:accent-[#DFB164] cursor-pointer disabled:opacity-50"
              />
              <div className="flex items-center justify-between text-[10px] font-medium text-[#7A6A56] dark:text-[#B8A893] tabular-nums">
                <span>{formatClock(currentTime)}</span>
                <span className="truncate px-2 text-[#5F4114] dark:text-[#E8C98F] font-semibold">
                  {book} {chapter} · {translation.toUpperCase()}
                </span>
                <span>{duration > 0 ? formatClock(duration) : "--:--"}</span>
              </div>
            </>
          ) : (
            <>
              <input
                type="range"
                min={0}
                max={Math.max(0, verses.length - 1)}
                step={1}
                value={Math.min(ttsVerseIdx, Math.max(0, verses.length - 1))}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setTtsVerseIdx(idx);
                  if (isPlaying) {
                    startTtsFrom(idx);
                  } else {
                    onSpeakingVerseChange(verses[idx]?.verse ?? null);
                  }
                }}
                disabled={!verses.length}
                aria-label="Read aloud verse position"
                className="w-full h-1.5 accent-[#9A6B24] dark:accent-[#DFB164] cursor-pointer disabled:opacity-50"
              />
              <div className="flex items-center justify-between text-[10px] font-medium text-[#7A6A56] dark:text-[#B8A893] tabular-nums">
                <span>v.{currentVerseNumber}</span>
                <span className="truncate px-2 text-[#5F4114] dark:text-[#E8C98F] font-semibold">
                  {book} {chapter} · {translation.toUpperCase()} (Read Aloud)
                </span>
                <span>v.{maxVerseNumber}</span>
              </div>
            </>
          )}
        </div>

        {/* Close Player */}
        <button
          type="button"
          onClick={() => {
            stopTts();
            stopStudioAudio();
            setIsPlaying(false);
            onClose();
          }}
          aria-label="Close audio player"
          className="p-1.5 rounded-xl text-[#7A6A56] dark:text-[#B8A893] hover:bg-[#EFE4D0] dark:hover:bg-[#31271C] transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Row 2: Source / Narrator Picker + Speed + Auto-Advance + Mode / Studio Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#E9D7B6]/70 dark:border-[#3A2E1E]">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Mode badge + Narrator selector */}
          {loadingMeta ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#7A6A56] dark:text-[#B8A893]">
              <Loader2 className="w-3 h-3 animate-spin text-[#9A6B24]" />
              Loading audio…
            </span>
          ) : mode === "studio" && activeTrack ? (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                <Headphones className="w-3 h-3" />
                {activeTrack.dramatized ? "Drama Studio" : "Studio Audio"}
              </span>
              {studioTracks.length > 1 ? (
                <select
                  value={activeTrack.id}
                  onChange={(e) => handleChangeNarrator(e.target.value)}
                  aria-label="Select Bible narrator"
                  className="px-2 py-0.5 rounded-lg border border-[#DFC9A3] dark:border-[#4A3A22] bg-white/90 dark:bg-[#17130E] text-[11px] font-semibold text-[#5F4114] dark:text-[#E8C98F] focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                >
                  {studioTracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] font-medium text-[#6B5B46] dark:text-[#C5B39B] truncate">
                  {activeTrack.narrator}
                </span>
              )}
              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode(true)}
                  title="Switch to verse-by-verse Device Read-Aloud"
                  className="text-[10px] font-medium text-[#8C7B63] dark:text-[#A39178] hover:text-[#9A6B24] dark:hover:text-[#DFB164] underline underline-offset-2 transition"
                >
                  Verse highlight
                </button>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2E3C6] dark:bg-[#352818] text-[#7B531A] dark:text-[#DFB164] text-[10px] font-semibold">
                <Volume2 className="w-3 h-3" />
                Device Voice
              </span>
              {studioTracks.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleSwitchMode(false)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 dark:bg-[#17130E] border border-[#DFC9A3] dark:border-[#4A3A22] hover:border-[#9A6B24] text-[10px] font-semibold text-[#7B531A] dark:text-[#DFB164] transition"
                >
                  <Headphones className="w-3 h-3" />
                  Back to Studio Audio
                </button>
              ) : (
                audioMeta?.suggestedStudioTranslations &&
                audioMeta.suggestedStudioTranslations.length > 0 && (
                  <div className="inline-flex flex-wrap items-center gap-1 text-[10px] text-[#7A6A56] dark:text-[#B8A893]">
                    <Sparkles className="w-3 h-3 text-[#9A6B24] dark:text-[#DFB164] shrink-0" />
                    <span>Studio audio:</span>
                    {audioMeta.suggestedStudioTranslations.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSwitchStudioTranslation(t)}
                        className="px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-[#17130E] border border-[#DFC9A3] dark:border-[#4A3A22] hover:border-[#9A6B24] font-semibold text-[#7B531A] dark:text-[#DFB164] uppercase transition"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Speed & Auto-Advance Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCycleRate}
            aria-label={`Playback speed ${prefs.rate}x. Click to change`}
            title="Change playback speed"
            className="px-2 py-0.5 rounded-lg bg-white/90 dark:bg-[#17130E] border border-[#DFC9A3] dark:border-[#4A3A22] hover:border-[#9A6B24] text-[11px] font-semibold text-[#5F4114] dark:text-[#E8C98F] tabular-nums transition"
          >
            {prefs.rate}x
          </button>

          <button
            type="button"
            onClick={() => updatePrefs({ autoAdvance: !prefs.autoAdvance })}
            aria-pressed={prefs.autoAdvance}
            title="Automatically advance to the next chapter when finished"
            className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition ${
              prefs.autoAdvance
                ? "bg-[#9A6B24] text-white border-[#9A6B24] dark:bg-[#DFB164] dark:text-[#141210] dark:border-[#DFB164]"
                : "bg-white/90 dark:bg-[#17130E] border-[#DFC9A3] dark:border-[#4A3A22] text-[#7A6A56] dark:text-[#B8A893]"
            }`}
          >
            <SkipForward className="w-3 h-3" />
            Auto-Next
          </button>
        </div>
      </div>

      {/* Inline non-blocking error banner with instant Read-Aloud fallback */}
      {audioError && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-3 py-1.5 text-[11px] text-rose-800 dark:text-rose-200">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{audioError}</span>
          </span>
          {mode === "studio" && ttsSupported && verses.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setAudioError(null);
                setForceTts(true);
                wantAutoPlayRef.current = true;
              }}
              className="px-2 py-0.5 rounded-md bg-rose-700 text-white font-semibold shrink-0 hover:bg-rose-800 transition"
            >
              Use Device Voice
            </button>
          )}
        </div>
      )}
    </div>
  );
}
