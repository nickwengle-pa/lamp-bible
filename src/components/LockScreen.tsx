"use client";

import React, { useState } from "react";
import { Lock, Loader2, AlertCircle } from "lucide-react";

interface LockScreenProps {
  onUnlocked: (rememberDevice: boolean) => void;
}

export default function LockScreen({ onUnlocked }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Incorrect passcode.");
        setPin("");
        return;
      }
      onUnlocked(remember);
    } catch {
      setError("Network error while verifying passcode.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] dark:bg-[#141210] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-8 shadow-xl text-center space-y-5"
      >
        <div className="mx-auto flex items-center justify-center gap-2.5">
          <img src="/icon.svg" alt="Lamp" className="w-10 h-10 rounded-xl shadow-sm" />
        </div>

        <div>
          <h1 className="font-serif text-2xl font-semibold">Lamp Is Locked</h1>
          <p className="text-xs text-[#6B635B] dark:text-[#A39A90] mt-1">
            Enter your personal passcode to access your Bible studies & notes.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-200 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Lock className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#6B635B] dark:text-[#A39A90] cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-[#DFD5C5] accent-[#9A6B24]"
            />
            Remember this device
          </label>
        </div>

        <button
          type="submit"
          disabled={verifying || !pin.trim()}
          className="w-full py-3 rounded-xl bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-45"
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Unlocking...
            </>
          ) : (
            "Unlock Lamp"
          )}
        </button>
      </form>
    </div>
  );
}
