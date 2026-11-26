"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  BookOpen,
  Languages,
  Sparkles,
  Mic,
  Youtube,
  Camera,
  Library,
  Star,
  Bookmark,
  Volume2,
  CheckSquare,
  Share2,
  Compass,
  Smartphone,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { LampTitleLockup } from "./LampBrand";

export type GuideTargetTab =
  | "library"
  | "words"
  | "bible"
  | "record"
  | "youtube"
  | "scan";

interface OnboardingGuideModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateFeature?: (tab: GuideTargetTab) => void;
}

interface GuideSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  exampleLabel: string;
  exampleText: string;
  tryTab?: GuideTargetTab;
  tryLabel?: string;
}

const SLIDES: GuideSlide[] = [
  {
    id: "welcome",
    badge: "Step 1 of 7 · Welcome",
    title: "Welcome to Lamp",
    subtitle:
      "Your personal, cloud-synced Bible study studio — built for daily reading, Greek & Hebrew word studies, Sunday sermon recording, and deeper Scripture reflection.",
    exampleLabel: "Quick Tip — Install on Your Phone",
    exampleText:
      "On iPhone Safari tap Share → Add to Home Screen (or Chrome → Install App on Android) to get the golden Bible & Flame icon right on your home screen. Your notes sync automatically across all devices.",
  },
  {
    id: "bible",
    badge: "Step 2 of 7 · Bible Reader",
    title: "Read & Tap Any Verse to Study",
    subtitle:
      "Switch freely between ESV, NIV, NLT, NASB, BSB, KJV, and more. Tap any verse to open the Lamp Verse Study sheet right on top of the page.",
    exampleLabel: "Try This Example",
    exampleText:
      "Tap John 1:1 → pick Gold or Sage to highlight just the text, type a personal margin note (adds a gold ★ star next to the verse), explore Explain / Deep Study / Related, or tap Share to save a square quote card.",
    tryTab: "bible",
    tryLabel: "Open Bible Reader",
  },
  {
    id: "words",
    badge: "Step 3 of 7 · Original Languages",
    title: "Greek & Hebrew Word Studies + Audio",
    subtitle:
      "Go straight to the original text with real word-by-word interlinear parsing, Strong's / BDB / Thayer's lexicons, and real Greek & Hebrew pronunciation.",
    exampleLabel: "Try This Example",
    exampleText:
      "Open the Original tab on any verse and tap a word (or browse featured cards like Logos, Chesed, and Shalom in Words). Tap Hear to listen to the pronunciation, or search any English word or Strong's code like G3056.",
    tryTab: "words",
    tryLabel: "Explore Word Cards",
  },
  {
    id: "guided",
    badge: "Step 4 of 7 · Study Builder",
    title: "Guided Study & Lesson Builder",
    subtitle:
      "Need a personal Bible study, small-group lesson outline, or biblical encouragement for a tough week? Lamp builds context-faithful study guides grounded in historical-grammatical hermeneutics.",
    exampleLabel: "Try This Example",
    exampleText:
      "Go to Words → Guided Study Builder, pick 'Study a Passage' or 'Struggling With Something', type 'Psalm 23' or 'Peace in anxiety', and Lamp generates a full outline with clickable Scripture links saved to your Library.",
    tryTab: "words",
    tryLabel: "Try Study Builder",
  },
  {
    id: "record",
    badge: "Step 5 of 7 · Sunday Services",
    title: "Live Sermon Recorder (60+ Min)",
    subtitle:
      "Record a full Sunday message with Screen Wake Lock, optional live captions, and timestamped notes — even while flipping over to the Bible tab to read along.",
    exampleLabel: "Try This Example",
    exampleText:
      "Tap Record → Start Live Recording during church, tap Drop Timestamp when a quote stands out, or flip to Bible to highlight a passage (your mic keeps recording in the background!). When finished, tap Structure with Lamp AI.",
    tryTab: "record",
    tryLabel: "Open Sermon Recorder",
  },
  {
    id: "youtube-scan",
    badge: "Step 6 of 7 · Capture Anywhere",
    title: "YouTube Sermons & Printed Bible Scanner",
    subtitle:
      "Catch up on missed sermons from YouTube or snap a photo of a physical study Bible page to jump straight to that passage.",
    exampleLabel: "Where to Find Them",
    exampleText:
      "On phones, tap the top-right ☰ menu (or left sidebar on desktop) for YouTube Study and Scripture Scan. Paste any YouTube sermon URL for a complete outline, or point your camera at a printed Bible page.",
    tryTab: "youtube",
    tryLabel: "Try YouTube Study",
  },
  {
    id: "library",
    badge: "Step 7 of 7 · Your Archive",
    title: "Search, Organize & Ask Follow-Ups",
    subtitle:
      "Every sermon, YouTube digest, scanned passage, and saved verse study lives in your private Library — organized by Series, checkable takeaways, and interactive follow-up chat.",
    exampleLabel: "Try This Example",
    exampleText:
      "Use the Scripture Selector on Home to jump to any Book, Chapter & Verse (or filter notes mentioning it). Open any saved note to check off weekly takeaways, ask Lamp follow-up questions, or replay this guide anytime in Settings.",
    tryTab: "library",
    tryLabel: "Go to My Library",
  },
];

const AUTOPLAY_MS = 6500;

function SlideVisual({ slideId }: { slideId: string }) {
  switch (slideId) {
    case "welcome":
      return (
        <div className="rounded-2xl bg-gradient-to-br from-[#FAF4E8] via-[#FDFCFA] to-[#F3E5C8]/60 dark:from-[#241E16] dark:via-[#1B1815] dark:to-[#2B2216] border border-[#E6D5B5] dark:border-[#3E3220] p-5 flex flex-col items-center text-center gap-3">
          <LampTitleLockup size="md" subtitle="PSALM 119:105" />
          <p className="font-serif italic text-xs sm:text-sm text-[#5F4E37] dark:text-[#D9C6A5] max-w-sm">
            &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;
          </p>
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm pt-1">
            {[
              { icon: BookOpen, label: "9 Translations" },
              { icon: Languages, label: "Greek & Hebrew" },
              { icon: Smartphone, label: "Cloud Synced" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl bg-white/85 dark:bg-[#141210]/85 border border-[#E6DCCB] dark:border-[#2F2A24] px-2 py-2.5 flex flex-col items-center gap-1"
                >
                  <Icon className="w-4 h-4 text-[#9A6B24] dark:text-[#DFB164]" />
                  <span className="text-[10px] font-semibold text-[#3F3A35] dark:text-[#DED6CB]">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "bible":
      return (
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-3 text-left">
          <div className="flex items-center justify-between text-[11px] border-b border-[#EFE8DC] dark:border-[#2A2520] pb-2">
            <span className="font-serif font-semibold text-sm">John 1</span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-[#FAF4E8] dark:bg-[#2B2216] text-[#9A6B24] dark:text-[#DFB164] font-semibold text-[10px]">
                ESV · NIV · NLT · BSB
              </span>
            </div>
          </div>
          <div className="font-serif text-sm leading-relaxed space-y-1.5">
            <p>
              <sup className="font-sans text-[10px] font-bold text-[#9A6B24] dark:text-[#DFB164] mr-1 inline-flex items-center gap-0.5">
                1
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 inline" />
                <Bookmark className="w-2.5 h-2.5 fill-emerald-500 text-emerald-600 inline" />
              </sup>
              <span className="bg-amber-200/75 dark:bg-amber-700/45 rounded px-1 py-0.5">
                In the beginning was the Word, and the Word was with God, and the Word was God.
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF4E8] dark:bg-[#231D15] border border-[#E5CCA0] dark:border-[#423420] p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-[#1C1917] dark:ring-white" />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400" />
              <span className="w-3.5 h-3.5 rounded-full bg-rose-400" />
              <span className="ml-1 font-semibold text-[#7B531A] dark:text-[#DFB164]">
                Explain · Original · Deep Study · Related
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-[#141210] font-semibold">
              <Share2 className="w-3 h-3 text-[#9A6B24]" />
              Share Card
            </span>
          </div>
        </div>
      );

    case "words":
      return (
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-semibold">Λόγος</span>
                <span className="px-2 py-0.5 rounded-md bg-[#F7EAD0] dark:bg-[#3A2D1B] text-[#7B531A] dark:text-[#DFB164] font-mono text-[10px] font-bold">
                  G3056
                </span>
              </div>
              <p className="text-xs italic text-[#9A6B24] dark:text-[#DFB164]">
                Logos · &ldquo;Word, Divine Expression&rdquo;
              </p>
            </div>
            <span className="px-2.5 py-1.5 rounded-xl bg-[#FAF4E8] dark:bg-[#2B2216] border border-[#DFC9A3] dark:border-[#4A3A22] text-[11px] font-semibold inline-flex items-center gap-1.5 text-[#7B531A] dark:text-[#DFB164]">
              <Volume2 className="w-3.5 h-3.5" />
              Hear Greek
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-left">
            {[
              { g: "Ἐν", t: "En", gl: "In" },
              { g: "ἀρχῇ", t: "archē", gl: "beginning" },
              { g: "ἦν", t: "ēn", gl: "was" },
              { g: "Λόγος", t: "Logos", gl: "Word", active: true },
            ].map((w) => (
              <div
                key={w.t}
                className={`px-2.5 py-1.5 rounded-lg border text-[10px] ${
                  w.active
                    ? "border-[#9A6B24] bg-[#F7EAD0]/75 dark:bg-[#3A2D1B]"
                    : "border-[#E6DCCB] dark:border-[#2F2A24] bg-[#FAF7F2] dark:bg-[#1D1A17]"
                }`}
              >
                <span className="font-serif font-semibold block text-xs">{w.g}</span>
                <span className="text-[#6B635B] dark:text-[#A39A90]">{w.gl}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "guided":
      return (
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-2.5 text-left">
          <div className="grid grid-cols-3 gap-2">
            {[
              { title: "Study a Passage", sub: "e.g. Psalm 23", active: true },
              { title: "Create a Lesson", sub: "Small group outline" },
              { title: "Struggling With", sub: "Biblical hope" },
            ].map((c) => (
              <div
                key={c.title}
                className={`rounded-xl p-2.5 border ${
                  c.active
                    ? "border-[#9A6B24] bg-[#FAF4E8] dark:bg-[#2B2216]"
                    : "border-[#E6DCCB] dark:border-[#2F2A24] bg-[#FAF7F2] dark:bg-[#1D1A17]"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-[#9A6B24] dark:text-[#DFB164] mb-1" />
                <p className="text-[11px] font-semibold leading-tight">{c.title}</p>
                <p className="text-[10px] text-[#6B635B] dark:text-[#A39A90] mt-0.5">
                  {c.sub}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[#FAF7F2] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] px-3 py-2 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-[#574F47] dark:text-[#D5CDC2]">
              <Sparkles className="w-3.5 h-3.5 text-[#9A6B24]" />
              Context-based exegesis + clickable verses
            </span>
            <span className="font-semibold text-[#9A6B24] dark:text-[#DFB164]">
              Auto-saved
            </span>
          </div>
        </div>
      );

    case "record":
      return (
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Recording · 34:18
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
              Screen Awake · Live Captions
            </span>
          </div>
          <div className="h-9 flex items-center justify-center gap-1">
            {[26, 48, 72, 38, 86, 60, 32, 78, 92, 54, 40, 70, 84, 46, 30, 66].map(
              (h, idx) => (
                <span
                  key={idx}
                  className="w-1.5 rounded-full bg-[#9A6B24] dark:bg-[#DFB164]"
                  style={{ height: `${h}%` }}
                />
              )
            )}
          </div>
          <div className="rounded-xl bg-[#FAF7F2] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] px-3 py-2 text-left text-[11px] text-[#574F47] dark:text-[#CFC5B9] flex items-center justify-between gap-2">
            <span className="truncate">
              <strong className="text-[#9A6B24] dark:text-[#DFB164]">[14:22]</strong>{" "}
              &ldquo;Abiding comes before fruitfulness — John 15:4&rdquo;
            </span>
            <Mic className="w-3.5 h-3.5 text-[#9A6B24] shrink-0" />
          </div>
        </div>
      );

    case "youtube-scan":
      return (
        <div className="grid sm:grid-cols-2 gap-2.5 text-left">
          <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Youtube className="w-4 h-4" />
              YouTube Study
            </div>
            <div className="rounded-lg bg-[#FAF7F2] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] px-2.5 py-1.5 text-[10px] text-[#6B635B] truncate">
              youtube.com/watch?v=...
            </div>
            <p className="text-[11px] text-[#574F47] dark:text-[#CFC5B9]">
              Full outline, Scripture links &amp; takeaways — even for hour-long teachings.
            </p>
          </div>
          <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-3.5 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Camera className="w-4 h-4" />
              Scripture Scanner
            </div>
            <div className="rounded-lg bg-[#FAF7F2] dark:bg-[#1D1A17] border border-dashed border-[#DFC9A3] dark:border-[#4A3A22] px-2.5 py-1.5 text-[10px] text-[#7B531A] dark:text-[#DFB164] font-medium">
              Detected: Philippians 4:6-8 →
            </div>
            <p className="text-[11px] text-[#574F47] dark:text-[#CFC5B9]">
              Snap a printed Bible page to transcribe &amp; open directly in the Reader.
            </p>
          </div>
        </div>
      );

    case "library":
    default:
      return (
        <div className="rounded-2xl bg-[#FDFCFA] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-2.5 text-left">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9A6B24] dark:text-[#DFB164]">
              <Library className="w-3.5 h-3.5" />
              Sunday Notes · Gospel of John
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7EAD0] dark:bg-[#3A2D1B] text-[#7B531A] dark:text-[#DFB164] font-semibold">
              Private Sync
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-[#3F3A35] dark:text-[#D5CDC2]">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Read John 15:1-11 slowly before checking notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#9A6B24] shrink-0" />
              <span className="italic text-[#6B635B] dark:text-[#A39A90]">
                Ask Lamp: &ldquo;How does abiding connect to the Holy Spirit?&rdquo;
              </span>
            </div>
          </div>
        </div>
      );
  }
}

export default function OnboardingGuideModal({
  open,
  onClose,
  onNavigateFeature,
}: OnboardingGuideModalProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setPlaying(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !playing) return;
    const timer = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= SLIDES.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [open, playing]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setPlaying(false);
        setStep((s) => Math.min(SLIDES.length - 1, s + 1));
      }
      if (e.key === "ArrowLeft") {
        setPlaying(false);
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const current = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  const togglePlay = () => {
    if (!playing && isLast) {
      setStep(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lamp Beginner's Guide"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full max-w-xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#DFC9A3] dark:border-[#4A3A22] shadow-2xl overflow-hidden">
        {/* Top Progress Bars (story-style) */}
        <div className="px-5 pt-3.5 pb-2 bg-[#FAF4E8] dark:bg-[#251E15] flex items-center gap-1.5 shrink-0">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to step ${idx + 1}: ${s.title}`}
              onClick={() => {
                setPlaying(false);
                setStep(idx);
              }}
              className="h-1.5 flex-1 rounded-full bg-[#E3D3B5] dark:bg-[#3A2F21] overflow-hidden"
            >
              <span
                className={`block h-full rounded-full transition-all duration-300 ${
                  idx <= step
                    ? "w-full bg-[#9A6B24] dark:bg-[#DFB164]"
                    : "w-0 bg-transparent"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="px-5 py-3 bg-[#FAF4E8] dark:bg-[#251E15] border-b border-[#E9D7B6] dark:border-[#3C301E] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164]">
            {current.badge}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition ${
                playing
                  ? "bg-[#9A6B24] text-white border-[#9A6B24]"
                  : "bg-white/80 dark:bg-black/25 border-[#DFC9A3] dark:border-[#4A3A22] text-[#7B531A] dark:text-[#DFB164] hover:border-[#9A6B24]"
              }`}
            >
              {playing ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause Tour
                </>
              ) : isLast ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Auto-Play
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close beginner's guide"
              className="p-1.5 rounded-lg text-[#6B635B] hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Content */}
        <div className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4">
          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F0E8]">
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed text-[#574F47] dark:text-[#CFC5B9]">
              {current.subtitle}
            </p>
          </div>

          {/* Interactive Feature Visual Preview */}
          <SlideVisual slideId={current.id} />

          {/* Concrete Real-World Example Box */}
          <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {current.exampleLabel}
            </p>
            <p className="text-xs sm:text-sm leading-relaxed text-[#3F3A35] dark:text-[#D5CDC2]">
              {current.exampleText}
            </p>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-5 py-4 bg-[#FAF7F2] dark:bg-[#171411] border-t border-[#E6DCCB] dark:border-[#2F2A24] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => {
              setPlaying(false);
              setStep((s) => Math.max(0, s - 1));
            }}
            className="px-3.5 py-2 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {current.tryTab && onNavigateFeature && (
              <button
                type="button"
                onClick={() => {
                  onNavigateFeature(current.tryTab!);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-[#DFC9A3] dark:border-[#4A3A22] bg-[#FAF4E8] dark:bg-[#251E15] text-[#7B531A] dark:text-[#DFB164] text-xs font-semibold inline-flex items-center gap-1.5 hover:brightness-95 transition"
              >
                {current.tryLabel || "Try It"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold shadow-sm transition"
              >
                Start Studying
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStep((s) => Math.min(SLIDES.length - 1, s + 1));
                }}
                className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#322C27] dark:bg-[#DFB164] dark:text-[#141210] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
