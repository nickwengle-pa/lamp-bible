"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Copy, Check, Download, Share2 } from "lucide-react";

interface ShareVerseModalProps {
  open: boolean;
  onClose: () => void;
  reference: string;
  verseText: string;
  translation: string;
}

type CardStyle = "parchment" | "candlelight" | "olive";

const CARD_STYLES: Record<
  CardStyle,
  { label: string; bg: string; border: string; text: string; accent: string; sub: string }
> = {
  parchment: {
    label: "Parchment",
    bg: "#FAF7F2",
    border: "#DFC9A3",
    text: "#1C1917",
    accent: "#9A6B24",
    sub: "#6B635B",
  },
  candlelight: {
    label: "Candlelight",
    bg: "#191613",
    border: "#4A3A22",
    text: "#F5F0E8",
    accent: "#E0B166",
    sub: "#A39A90",
  },
  olive: {
    label: "Olive Grove",
    bg: "#1E2620",
    border: "#45584A",
    text: "#F2F5F0",
    accent: "#C9D6A3",
    sub: "#9FB0A2",
  },
};

export default function ShareVerseModal({
  open,
  onClose,
  reference,
  verseText,
  translation,
}: ShareVerseModalProps) {
  const [style, setStyle] = useState<CardStyle>("candlelight");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formattedQuote = `“${verseText.trim()}”\n— ${reference} (${translation.toUpperCase()})`;

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = CARD_STYLES[style];
    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle inset editorial frame
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(56, 56, W - 112, H - 112);

    // Top decorative accent line
    ctx.fillStyle = palette.accent;
    ctx.fillRect(W / 2 - 44, 130, 88, 5);

    // Word-wrap verse text in centered serif
    const fontSize = verseText.length > 220 ? 40 : verseText.length > 130 ? 48 : 56;
    ctx.font = `italic ${fontSize}px Georgia, Cambria, serif`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = "center";

    const maxWidth = W - 220;
    const words = `“${verseText.trim()}”`.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    const lineHeight = fontSize * 1.48;
    const totalHeight = lines.length * lineHeight;
    const startY = Math.max(240, (H - totalHeight) / 2 - 10);

    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, startY + idx * lineHeight);
    });

    // Reference
    const refY = Math.min(H - 210, startY + totalHeight + 68);
    ctx.font = "600 34px Georgia, Cambria, serif";
    ctx.fillStyle = palette.accent;
    ctx.fillText(`${reference}  ·  ${translation.toUpperCase()}`, W / 2, refY);

    // Lamp footer watermark
    ctx.font = "500 22px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = palette.sub;
    ctx.fillText("LAMP  ·  PSALM 119:105", W / 2, H - 110);
  }, [open, style, reference, verseText, translation]);

  if (!open) return null;

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(formattedQuote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${reference.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    try {
      if (canvas && navigator.canShare) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (blob) {
          const file = new File(
            [blob],
            `${reference.replace(/[^a-z0-9]+/gi, "-")}.png`,
            { type: "image/png" }
          );
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: reference,
              text: formattedQuote,
              files: [file],
            });
            return;
          }
        }
      }
      if (navigator.share) {
        await navigator.share({ title: reference, text: formattedQuote });
      } else {
        await handleCopyText();
      }
    } catch {
      // User dismissed share sheet
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E6DCCB] dark:border-[#2F2A24] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold">Share Scripture Card</h3>
            <p className="text-xs text-[#6B635B] dark:text-[#A39A90]">
              {reference} ({translation.toUpperCase()})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Style Picker */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CARD_STYLES) as CardStyle[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setStyle(k)}
                className={`py-2 rounded-xl text-xs font-semibold border transition ${
                  style === k
                    ? "border-[#9A6B24] bg-[#F7EAD0]/70 text-[#7B531A] dark:bg-[#3A2D1B] dark:text-[#DFB164]"
                    : "border-[#E6DCCB] dark:border-[#322C26] text-[#6B635B] dark:text-[#A39A90]"
                }`}
              >
                {CARD_STYLES[k].label}
              </button>
            ))}
          </div>

          {/* Live Canvas Preview */}
          <div className="rounded-2xl overflow-hidden border border-[#E6DCCB] dark:border-[#2F2A24] shadow-inner aspect-square">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Text
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] hover:bg-[#F2ECE1] dark:hover:bg-[#2A2520] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Save Image
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2.5 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
