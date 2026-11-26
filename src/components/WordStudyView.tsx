"use client";

import React, { useState } from "react";
import {
  Search,
  Volume2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Loader2,
  Compass,
  GraduationCap,
  HeartHandshake,
  Languages,
  AlertCircle,
} from "lucide-react";
import { AppSettings, StudyNote } from "@/lib/types";
import { aiHeaders } from "@/lib/client-api";
import { pronounceWord } from "@/lib/pronounce";

interface WordCard {
  strongs: string;
  language: "Greek" | "Hebrew";
  original: string;
  transliteration: string;
  pronunciation: string;
  english: string;
  summary: string;
  culturalContext: string;
  keyVerses: string[];
}

const FEATURED_WORDS: WordCard[] = [
  {
    strongs: "G3056",
    language: "Greek",
    original: "Λόγος",
    transliteration: "Logos",
    pronunciation: "log-os",
    english: "Word · Divine Reason · Living Expression",
    summary:
      "Far more than spoken syllables, Logos unites Hebrew 'Dabar' (God's creative, active Word) with Greek philosophy's ordering principle of the cosmos — revealed in John 1:1 as Jesus Christ Himself.",
    culturalContext:
      "First-century Jews heard echoes of Genesis 1 ('And God said...'), while Greek readers recognized the ultimate rationality holding creation together.",
    keyVerses: ["John 1:1", "John 1:14", "Hebrews 4:12", "1 John 1:1"],
  },
  {
    strongs: "H2617",
    language: "Hebrew",
    original: "חֶסֶד",
    transliteration: "Chesed",
    pronunciation: "kheh-sed",
    english: "Steadfast Love · Covenant Loyalty · Unfailing Mercy",
    summary:
      "One of the richest words in the Old Testament — a fierce, faithful, loyal love that keeps its promise even when the other party fails.",
    culturalContext:
      "In ancient Near Eastern covenants, chesed was love backed by oath and action, never merely a fleeting emotion. Used over 240 times across the Old Testament.",
    keyVerses: ["Psalm 136:1", "Lamentations 3:22-23", "Exodus 34:6", "Micah 6:8"],
  },
  {
    strongs: "G26",
    language: "Greek",
    original: "Ἀγάπη",
    transliteration: "Agapē",
    pronunciation: "ah-gah-pay",
    english: "Self-Giving Love · Unconditional Devotion",
    summary:
      "A deliberate, sacrificial choice to seek the highest good of another, modeled supremely by Christ laying down His life on the cross.",
    culturalContext:
      "Rarely used in classical Greek before Christianity; New Testament writers elevated agapē to describe God's very nature (1 John 4:8).",
    keyVerses: ["1 Corinthians 13:4-7", "John 3:16", "Romans 5:8", "1 John 4:8"],
  },
  {
    strongs: "H7965",
    language: "Hebrew",
    original: "שָׁלוֹם",
    transliteration: "Shalom",
    pronunciation: "shah-lohm",
    english: "Wholeness · Peace · Flourishing Harmony",
    summary:
      "Not merely the absence of conflict, but complete restoration — everything in right relationship with God, others, self, and creation.",
    culturalContext:
      "Still the daily Hebrew greeting; rooted in the idea of repaying a debt or completing an unfinished wall so nothing is missing or broken.",
    keyVerses: ["Numbers 6:24-26", "Isaiah 26:3", "Jeremiah 29:11", "Psalm 29:11"],
  },
  {
    strongs: "G5485",
    language: "Greek",
    original: "Χάρις",
    transliteration: "Charis",
    pronunciation: "khah-ris",
    english: "Grace · Unearned Favor · Empowering Gift",
    summary:
      "God's generous, freely given favor toward the undeserving — both pardoning sin and actively empowering believers to walk in new life.",
    culturalContext:
      "In Greco-Roman patronage culture, charis described a benefactor's lavish gift; Paul turned it upside down by showing God gives with zero repayment required.",
    keyVerses: ["Ephesians 2:8-9", "2 Corinthians 12:9", "John 1:16", "Titus 2:11"],
  },
  {
    strongs: "G3306",
    language: "Greek",
    original: "Μένω",
    transliteration: "Menō",
    pronunciation: "men-oh",
    english: "Abide · Remain · Make Your Home",
    summary:
      "To stay settled, rooted, and at home in Christ rather than visiting occasionally — the secret of lasting spiritual fruit in John 15.",
    culturalContext:
      "A favorite word of the Apostle John (used over 40 times in his Gospel and letters), picturing mutual indwelling between Christ and His disciples.",
    keyVerses: ["John 15:4-5", "1 John 4:16", "John 8:31", "1 Corinthians 13:13"],
  },
  {
    strongs: "H7307",
    language: "Hebrew",
    original: "רוּחַ",
    transliteration: "Ruach",
    pronunciation: "roo-akh",
    english: "Spirit · Breath · Wind",
    summary:
      "The life-giving breath of God that hovered over the waters at creation, empowered prophets, and brings dry bones back to life.",
    culturalContext:
      "Because wind is invisible yet undeniably powerful in its effects, Hebrew used the exact same word for breath, wind, and the Spirit of God.",
    keyVerses: ["Genesis 1:2", "Psalm 51:10-11", "Ezekiel 37:5", "Joel 2:28"],
  },
  {
    strongs: "G3341",
    language: "Greek",
    original: "Μετάνοια",
    transliteration: "Metanoia",
    pronunciation: "met-ah-noy-ah",
    english: "Repentance · Transformation of Mind & Direction",
    summary:
      "Literally 'beyond the mind' — a complete reorientation of how you see God, yourself, and the world, turning away from self-rule toward Christ.",
    culturalContext:
      "Far deeper than feeling guilty; in the Gospels, metanoia is the joyful doorway into the Kingdom of God.",
    keyVerses: ["Matthew 4:17", "Romans 12:2", "Acts 3:19", "2 Peter 3:9"],
  },
  {
    strongs: "G4102",
    language: "Greek",
    original: "Πίστις",
    transliteration: "Pistis",
    pronunciation: "pis-tis",
    english: "Faith · Trust · Allegiance · Faithfulness",
    summary:
      "Active, relational trust and loyal allegiance to Jesus — not blind wishing, but staking your life on God's proven character.",
    culturalContext:
      "In the first century, pistis meant both trust placed in someone and steadfast loyalty/faithfulness in return.",
    keyVerses: ["Hebrews 11:1", "Romans 1:17", "Galatians 2:20", "Ephesians 2:8"],
  },
  {
    strongs: "H3519",
    language: "Hebrew",
    original: "כָּבוֹד",
    transliteration: "Kabod",
    pronunciation: "kah-vode",
    english: "Glory · Weightiness · Radiant Presence",
    summary:
      "Literally 'heaviness' or 'substance' — the unmistakable weight, splendor, and nearness of God's presence that fills the temple and creation.",
    culturalContext:
      "Contrast with 'hevel' (vapor/vanity in Ecclesiastes): idols are weightless smoke, whereas God's kabod is enduring reality and worth.",
    keyVerses: ["Psalm 19:1", "Isaiah 6:3", "Exodus 33:18", "Habakkuk 2:14"],
  },
];

interface LexiconEntry {
  strongs: string;
  lexeme: string;
  transliteration: string;
  pronunciation: string;
  shortDefinition: string;
  definitionLines: string[];
}

interface WordStudyViewProps {
  settings: AppSettings;
  onOpenScripture: (reference: string) => void;
  onNoteCreated: (note: StudyNote) => void;
}

export default function WordStudyView({
  settings,
  onOpenScripture,
  onNoteCreated,
}: WordStudyViewProps) {
  const [subTab, setSubTab] = useState<"words" | "guided">("words");
  const [cardIndex, setCardIndex] = useState(0);

  // Lexicon Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingLexicon, setSearchingLexicon] = useState(false);
  const [lexiconResults, setLexiconResults] = useState<LexiconEntry[] | null>(
    null
  );
  const [lexiconError, setLexiconError] = useState<string | null>(null);
  const [activeCardLexicon, setActiveCardLexicon] =
    useState<LexiconEntry | null>(null);
  const [loadingCardLexicon, setLoadingCardLexicon] = useState(false);

  // Guided Study Builder state
  const [guidedMode, setGuidedMode] = useState<
    "passage" | "lesson" | "struggle" | "word"
  >("passage");
  const [guidedTopic, setGuidedTopic] = useState("");
  const [guidedAudience, setGuidedAudience] = useState("");
  const [guidedDetails, setGuidedDetails] = useState("");
  const [generatingStudy, setGeneratingStudy] = useState(false);
  const [guidedError, setGuidedError] = useState<string | null>(null);

  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  const currentWord = FEATURED_WORDS[cardIndex];

  const speakWord = (
    key: string,
    text: string,
    opts?: { fallbackText?: string; language?: string; strongs?: string }
  ) => {
    pronounceWord({
      text,
      fallbackText: opts?.fallbackText || text,
      language: opts?.language,
      strongs: opts?.strongs,
      onStart: () => setSpeakingKey(key),
      onEnd: () => setSpeakingKey((cur) => (cur === key ? null : cur)),
    });
  };

  const loadLexiconForCard = async (strongs: string) => {
    setLoadingCardLexicon(true);
    setActiveCardLexicon(null);
    try {
      const res = await fetch(
        `/api/lexicon?q=${encodeURIComponent(strongs)}`
      );
      if (res.ok) {
        const data = (await res.json()) as { entries?: LexiconEntry[] };
        setActiveCardLexicon(data.entries?.[0] || null);
      }
    } finally {
      setLoadingCardLexicon(false);
    }
  };

  const handleLexiconSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchingLexicon(true);
    setLexiconError(null);
    setLexiconResults(null);
    try {
      const res = await fetch(
        `/api/lexicon?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = (await res.json()) as {
        entries?: LexiconEntry[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Lookup failed.");
      }
      setLexiconResults(data.entries || []);
    } catch (err) {
      setLexiconError(
        err instanceof Error ? err.message : "Could not search Strong's lexicon."
      );
    } finally {
      setSearchingLexicon(false);
    }
  };

  const launchDeepWordStudy = async (wordTitle: string) => {
    setGeneratingStudy(true);
    setGuidedError(null);
    try {
      const res = await fetch("/api/ai/guided-study", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          mode: "word",
          topic: wordTitle,
          saveToLibrary: true,
        }),
      });
      const data = (await res.json()) as { note?: StudyNote; error?: string };
      if (!res.ok || !data.note) {
        throw new Error(data.error || "Could not create word study.");
      }
      onNoteCreated(data.note);
    } catch (err) {
      setGuidedError(
        err instanceof Error ? err.message : "Word study generation failed."
      );
    } finally {
      setGeneratingStudy(false);
    }
  };

  const handleGenerateGuided = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidedTopic.trim()) return;
    setGeneratingStudy(true);
    setGuidedError(null);
    try {
      const res = await fetch("/api/ai/guided-study", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          mode: guidedMode,
          topic: guidedTopic.trim(),
          audience: guidedAudience.trim() || undefined,
          details: guidedDetails.trim() || undefined,
          saveToLibrary: true,
        }),
      });
      const data = (await res.json()) as { note?: StudyNote; error?: string };
      if (!res.ok || !data.note) {
        throw new Error(data.error || "Failed to generate guided study.");
      }
      onNoteCreated(data.note);
    } catch (err) {
      setGuidedError(
        err instanceof Error ? err.message : "Could not build study."
      );
    } finally {
      setGeneratingStudy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A6B24] dark:text-[#DFB164]">
            Original Languages & Guided Pathways
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
            Word Study & Study Builder
          </h1>
        </div>

        <div className="inline-flex rounded-2xl bg-[#F2ECE1] dark:bg-[#1D1A17] p-1 border border-[#E6DCCB] dark:border-[#2F2A24] self-start">
          <button
            onClick={() => setSubTab("words")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 ${
              subTab === "words"
                ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] shadow-sm"
                : "text-[#6B635B] dark:text-[#A39A90]"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            Word Cards & Strong&apos;s
          </button>
          <button
            onClick={() => setSubTab("guided")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 ${
              subTab === "guided"
                ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] shadow-sm"
                : "text-[#6B635B] dark:text-[#A39A90]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Guided Study Builder
          </button>
        </div>
      </div>

      {guidedError && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 flex items-start gap-2.5 text-sm text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{guidedError}</span>
        </div>
      )}

      {subTab === "words" ? (
        <div className="space-y-6">
          {/* Strong's / English Word Search */}
          <form
            onSubmit={handleLexiconSearch}
            className="flex gap-2 rounded-2xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-2 shadow-sm"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Look up Strong's # (e.g. G3056, H2617) or English word (grace, shepherd, covenant)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searchingLexicon || !searchQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-45 transition"
            >
              {searchingLexicon ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Lookup"
              )}
            </button>
          </form>

          {lexiconError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {lexiconError}
            </p>
          )}

          {/* Live Lexicon Search Results */}
          {lexiconResults && (
            <div className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#DFC9A3] dark:border-[#4A3A22] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold">
                  Strong&apos;s / BDB / Thayer&apos;s Results for &ldquo;{searchQuery}&rdquo;
                </h2>
                <button
                  onClick={() => setLexiconResults(null)}
                  className="text-xs text-[#6B635B] hover:underline"
                >
                  Clear results
                </button>
              </div>
              {lexiconResults.length === 0 ? (
                <p className="text-sm text-[#6B635B] dark:text-[#A39A90]">
                  No direct lexicon entries found. Try a Strong&apos;s code like{" "}
                  <code>G3056</code> or a single English word like <code>love</code>.
                </p>
              ) : (
                <div className="space-y-4">
                  {lexiconResults.map((entry, idx) => (
                    <div
                      key={`${entry.strongs}-${idx}`}
                      className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#F7EAD0] dark:bg-[#3A2D1B] text-[#7B531A] dark:text-[#DFB164] font-mono text-xs font-bold">
                            {entry.strongs}
                          </span>
                          <span className="font-serif text-xl font-semibold">
                            {entry.lexeme}
                          </span>
                          <span className="text-sm italic text-[#6B635B] dark:text-[#A39A90]">
                            {entry.transliteration}
                          </span>
                          {(entry.pronunciation || entry.lexeme) && (
                            <button
                              type="button"
                              onClick={() =>
                                speakWord(
                                  `lex-${entry.strongs}-${idx}`,
                                  entry.lexeme || entry.transliteration || entry.pronunciation,
                                  {
                                    fallbackText: entry.transliteration || entry.pronunciation,
                                    strongs: entry.strongs,
                                  }
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs text-[#9A6B24] dark:text-[#DFB164] hover:underline"
                            >
                              <Volume2
                                className={`w-3.5 h-3.5 ${
                                  speakingKey === `lex-${entry.strongs}-${idx}`
                                    ? "animate-pulse"
                                    : ""
                                }`}
                              />
                              {speakingKey === `lex-${entry.strongs}-${idx}`
                                ? "Playing..."
                                : entry.pronunciation
                                ? `(${entry.pronunciation})`
                                : "Hear"}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={generatingStudy}
                          onClick={() =>
                            launchDeepWordStudy(
                              `${entry.transliteration || entry.lexeme} (${entry.strongs})`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#1C1917] dark:bg-[#DFB164] text-white dark:text-[#141210] text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Deep AI Study
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed text-[#3F3A35] dark:text-[#D1C9BE] space-y-1 max-h-48 overflow-y-auto">
                        {entry.definitionLines.slice(0, 14).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Swipeable / Featured Word Discovery Card */}
          <div className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-[#FAF4E8] dark:bg-[#251E15] border-b border-[#E9D7B6] dark:border-[#3C301E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] text-[11px] font-semibold">
                  {currentWord.language} · {currentWord.strongs}
                </span>
                <span className="text-xs text-[#6B635B] dark:text-[#A39A90]">
                  Word Card {cardIndex + 1} of {FEATURED_WORDS.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setCardIndex(
                      (cardIndex - 1 + FEATURED_WORDS.length) %
                        FEATURED_WORDS.length
                    );
                    setActiveCardLexicon(null);
                  }}
                  className="p-2 rounded-xl border border-[#DFC9A3] dark:border-[#4A3A22] hover:bg-white/70 dark:hover:bg-black/20 transition"
                  aria-label="Previous word"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCardIndex((cardIndex + 1) % FEATURED_WORDS.length);
                    setActiveCardLexicon(null);
                  }}
                  className="p-2 rounded-xl border border-[#DFC9A3] dark:border-[#4A3A22] hover:bg-white/70 dark:hover:bg-black/20 transition"
                  aria-label="Next word"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              <div className="text-center space-y-2">
                <p className="font-serif text-5xl sm:text-6xl font-semibold text-[#1C1917] dark:text-[#F5F0E8] tracking-wide">
                  {currentWord.original}
                </p>
                <div className="flex items-center justify-center gap-2.5">
                  <span className="font-serif text-2xl italic text-[#9A6B24] dark:text-[#DFB164]">
                    {currentWord.transliteration}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      speakWord(`card-${currentWord.strongs}`, currentWord.original, {
                        fallbackText: currentWord.transliteration,
                        language: currentWord.language,
                        strongs: currentWord.strongs,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition ${
                      speakingKey === `card-${currentWord.strongs}`
                        ? "bg-[#F7EAD0] dark:bg-[#3A2D1B] text-[#7B531A] dark:text-[#DFB164] font-semibold"
                        : "bg-[#F2ECE1] dark:bg-[#2A2520] text-[#574F47] dark:text-[#CFC5B9] hover:text-[#9A6B24]"
                    }`}
                  >
                    <Volume2
                      className={`w-3.5 h-3.5 ${
                        speakingKey === `card-${currentWord.strongs}` ? "animate-pulse" : ""
                      }`}
                    />
                    {speakingKey === `card-${currentWord.strongs}`
                      ? "Playing..."
                      : currentWord.pronunciation}
                  </button>
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] pt-1">
                  {currentWord.english}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#EBE2D3] dark:border-[#2C2721] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-1.5">
                    Biblical Meaning
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3F3A35] dark:text-[#D5CDC2]">
                    {currentWord.summary}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#EBE2D3] dark:border-[#2C2721] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-1.5">
                    Cultural & Historical Backdrop
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3F3A35] dark:text-[#D5CDC2]">
                    {currentWord.culturalContext}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] mb-2">
                  Key Verses (Tap to Read in Bible)
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentWord.keyVerses.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => onOpenScripture(ref)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F7EAD0]/70 dark:bg-[#33281A] border border-[#E5CCA0] dark:border-[#4B3A23] text-xs font-semibold text-[#7B531A] dark:text-[#E8C98F] inline-flex items-center gap-1.5 hover:brightness-95 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {ref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Strong's Lexicon Expandable */}
              {activeCardLexicon && (
                <div className="rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] p-4 text-xs leading-relaxed text-[#3F3A35] dark:text-[#CFC5B9] space-y-1 max-h-56 overflow-y-auto">
                  <p className="font-semibold text-[#9A6B24] dark:text-[#DFB164] uppercase tracking-wider text-[11px] mb-1">
                    Full Strong&apos;s / BDB / Thayer&apos;s Entry ({activeCardLexicon.strongs})
                  </p>
                  {activeCardLexicon.definitionLines.slice(0, 18).map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => loadLexiconForCard(currentWord.strongs)}
                  disabled={loadingCardLexicon}
                  className="px-4 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-xs font-semibold inline-flex items-center gap-1.5 transition"
                >
                  {loadingCardLexicon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-[#9A6B24]" />
                  )}
                  Full Strong&apos;s Lexicon ({currentWord.strongs})
                </button>

                <button
                  type="button"
                  disabled={generatingStudy}
                  onClick={() =>
                    launchDeepWordStudy(
                      `${currentWord.transliteration} (${currentWord.original}, ${currentWord.strongs})`
                    )
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  {generatingStudy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Building Study...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Full Word Study to Library
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Word Chips Strip */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {FEATURED_WORDS.map((w, idx) => (
              <button
                key={w.strongs}
                onClick={() => {
                  setCardIndex(idx);
                  setActiveCardLexicon(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  idx === cardIndex
                    ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210]"
                    : "bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#6B635B] dark:text-[#A39A90] hover:border-[#B88435]"
                }`}
              >
                {w.transliteration}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Guided Study Builder ("Ultra" Pathways) */
        <form
          onSubmit={handleGenerateGuided}
          className="rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                id: "passage" as const,
                title: "Study a Passage",
                desc: "Deep verse-by-verse breakdown, history & Greek/Hebrew insights",
                icon: Compass,
              },
              {
                id: "lesson" as const,
                title: "Create a Lesson / Sermon",
                desc: "Teaching outline, illustrations & small-group questions",
                icon: GraduationCap,
              },
              {
                id: "struggle" as const,
                title: "Struggling With Something",
                desc: "Compassionate Scripture guidance & prayer for real life",
                icon: HeartHandshake,
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = guidedMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGuidedMode(item.id)}
                  className={`text-left p-4 rounded-2xl border transition ${
                    active
                      ? "border-[#9A6B24] bg-[#F7EAD0]/55 dark:bg-[#33281A]"
                      : "border-[#E6DCCB] dark:border-[#2F2A24] hover:border-[#B88435]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      active
                        ? "text-[#9A6B24] dark:text-[#DFB164]"
                        : "text-[#6B635B]"
                    }`}
                  />
                  <p className="font-serif text-base font-semibold">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6B635B] dark:text-[#A39A90] block mb-1.5">
                {guidedMode === "passage"
                  ? "Bible Passage (e.g. John 1:1-14, Psalm 23, Romans 8)"
                  : guidedMode === "lesson"
                  ? "Sermon or Lesson Topic / Passage"
                  : "What are you walking through right now?"}
              </label>
              <input
                type="text"
                required
                value={guidedTopic}
                onChange={(e) => setGuidedTopic(e.target.value)}
                placeholder={
                  guidedMode === "passage"
                    ? "e.g. John 1:1-14"
                    : guidedMode === "lesson"
                    ? "e.g. Forgiveness in Matthew 18"
                    : "e.g. Anxiety about the future, forgiving someone who hurt me..."
                }
                className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
              />
            </div>

            {guidedMode === "lesson" && (
              <div>
                <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1.5">
                  Audience (optional — e.g., Youth group, Men&apos;s study, Sunday morning)
                </label>
                <input
                  type="text"
                  value={guidedAudience}
                  onChange={(e) => setGuidedAudience(e.target.value)}
                  placeholder="e.g. Small group of 10 adults (45 minutes)"
                  className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1.5">
                Extra context or questions you want answered (optional)
              </label>
              <textarea
                rows={3}
                value={guidedDetails}
                onChange={(e) => setGuidedDetails(e.target.value)}
                placeholder="Share any specific questions, life details, or focus areas..."
                className="w-full rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-[#FAF7F2] dark:bg-[#141210] p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={generatingStudy || !guidedTopic.trim()}
            className="w-full py-3.5 rounded-2xl bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-45"
          >
            {generatingStudy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Building Your Guided Study...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Study & Save to Library
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
