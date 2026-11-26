"use client";

import React, { useState } from "react";
import { Sparkles, Send, Loader2, MessageSquareText } from "lucide-react";
import { AppSettings, ChatMessage } from "@/lib/types";
import { aiHeaders } from "@/lib/client-api";

interface AskVesselChatProps {
  settings: AppSettings;
  contextType: "note" | "bible";
  contextTitle: string;
  contextBody: string;
  suggestions?: string[];
  compact?: boolean;
}

export default function AskVesselChat({
  settings,
  contextType,
  contextTitle,
  contextBody,
  suggestions = [],
  compact = false,
}: AskVesselChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset conversation when switching notes or verses
  React.useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
  }, [contextTitle]);

  const sendQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || asking) return;
    setError(null);
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(nextHistory);
    setInput("");
    setAsking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: aiHeaders(settings),
        body: JSON.stringify({
          contextType,
          contextTitle,
          contextBody,
          history: messages,
          question: q,
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) {
        throw new Error(data.error || "Could not get an answer right now.");
      }
      setMessages([
        ...nextHistory,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ask Lamp.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div
      className={`rounded-2xl bg-[#FAF7F2] dark:bg-[#141210] border border-[#E6DCCB] dark:border-[#2F2A24] ${
        compact ? "p-3.5" : "p-5"
      } space-y-3`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164]">
        <MessageSquareText className="w-3.5 h-3.5" />
        Ask Lamp Follow-Up
      </div>

      {messages.length === 0 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendQuestion(s)}
              disabled={asking}
              className="text-left text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#322C26] hover:border-[#B88435] text-[#574F47] dark:text-[#CFC5B9] transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div
          className={`space-y-2.5 overflow-y-auto pr-1 ${
            compact ? "max-h-56" : "max-h-80"
          }`}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] ml-6"
                  : "bg-white dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] text-[#2C2723] dark:text-[#EAE3D8] mr-4"
              }`}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A6B24] dark:text-[#DFB164] mb-1">
                  <Sparkles className="w-3 h-3" />
                  Lamp
                </div>
              )}
              {m.content}
            </div>
          ))}
          {asking && (
            <div className="flex items-center gap-2 text-xs text-[#6B635B] dark:text-[#A39A90] px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9A6B24]" />
              Thinking through Scripture...
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            contextType === "bible"
              ? "Ask a follow-up question about this verse..."
              : "Ask anything about this sermon or how to apply it..."
          }
          className="flex-1 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#1D1A17] px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/40"
        />
        <button
          type="submit"
          disabled={asking || !input.trim()}
          className="px-3.5 py-2 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-45 transition"
        >
          <Send className="w-3.5 h-3.5" />
          Ask
        </button>
      </form>
    </div>
  );
}
