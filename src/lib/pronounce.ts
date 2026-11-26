"use client";

let sharedAudio: HTMLAudioElement | null = null;

function detectLang(
  text: string,
  languageHint?: string,
  strongs?: string
): "el" | "he" | "en" {
  const hint = (languageHint || "").toLowerCase();
  if (hint.includes("greek") || hint === "el") return "el";
  if (hint.includes("hebrew") || hint.includes("aramaic") || hint === "he") {
    return "he";
  }
  if (strongs) {
    if (strongs.toUpperCase().startsWith("G")) return "el";
    if (strongs.toUpperCase().startsWith("H")) return "he";
  }
  if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(text)) return "el";
  if (/[\u0590-\u05FF]/.test(text)) return "he";
  return "en";
}

function speakWithWebSpeech(
  text: string,
  lang: "el" | "he" | "en",
  onDone?: () => void
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone?.();
    return;
  }

  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "el" ? "el-GR" : lang === "he" ? "he-IL" : "en-US";
  utter.rate = 0.85;
  utter.volume = 1;
  utter.onend = () => onDone?.();
  utter.onerror = () => onDone?.();

  // iOS WebKit bug: calling cancel() immediately before speak() can swallow the new utterance.
  // Only cancel if something is actively speaking, and delay speak slightly when we do.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    window.setTimeout(() => {
      if (synth.paused) synth.resume();
      synth.speak(utter);
    }, 60);
  } else {
    if (synth.paused) synth.resume();
    synth.speak(utter);
  }
}

export interface PronounceOptions {
  /** Preferred text to pronounce (original Greek/Hebrew script works great for native TTS). */
  text: string;
  /** Readable transliteration fallback for Web Speech if native audio fails. */
  fallbackText?: string;
  language?: string;
  strongs?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Pronounces a Biblical Greek/Hebrew/English word reliably on iPhone Safari,
 * iOS Home Screen web apps, Android, and desktop.
 * Calls audio.play() synchronously inside the tap gesture so iOS allows playback,
 * and falls back cleanly to iOS-safe Web Speech synthesis if needed.
 */
export function pronounceWord({
  text,
  fallbackText,
  language,
  strongs,
  onStart,
  onEnd,
}: PronounceOptions) {
  if (typeof window === "undefined") return;

  const cleanText = text.trim();
  const cleanFallback = (fallbackText || cleanText).trim();
  if (!cleanText && !cleanFallback) return;

  const lang = detectLang(cleanText, language, strongs);
  const queryText = cleanText || cleanFallback;
  const url = `/api/pronounce?text=${encodeURIComponent(
    queryText
  )}&lang=${encodeURIComponent(lang)}`;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onEnd?.();
  };

  let fellBack = false;
  const triggerFallback = () => {
    if (fellBack) return;
    fellBack = true;
    speakWithWebSpeech(cleanFallback || queryText, "en", finish);
  };

  try {
    if (!sharedAudio) {
      sharedAudio = new Audio();
      sharedAudio.preload = "auto";
    }
    const audio = sharedAudio;
    audio.pause();
    audio.onended = finish;
    audio.onerror = triggerFallback;
    audio.src = url;
    audio.load();

    onStart?.();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        triggerFallback();
      });
    }
  } catch {
    onStart?.();
    triggerFallback();
  }
}
