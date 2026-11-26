"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Church, Ticket, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { LampTitleLockup } from "./LampBrand";

interface AuthScreenProps {
  userCount: number;
  inviteRequired: boolean;
  ownerSetupRequired?: boolean;
  googleAuthEnabled?: boolean;
  onAuthenticated: (user: UserProfile) => void;
}

export default function AuthScreen({
  userCount,
  inviteRequired,
  ownerSetupRequired = false,
  googleAuthEnabled = false,
  onAuthenticated,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">(
    userCount === 0 ? "signup" : "login"
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [church, setChurch] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [ownerSetupKey, setOwnerSetupKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authErr = params.get("authError");
    if (authErr) {
      setError(authErr);
      params.delete("authError");
      const nextSearch = params.toString();
      const nextUrl =
        window.location.pathname + (nextSearch ? `?${nextSearch}` : "");
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  const handleGoogleSignIn = () => {
    const params = new URLSearchParams();
    if (inviteCode.trim()) params.set("inviteCode", inviteCode.trim());
    if (ownerSetupKey.trim()) params.set("ownerSetupKey", ownerSetupKey.trim());
    const qs = params.toString();
    window.location.href = `/api/auth/google${qs ? `?${qs}` : ""}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setBusy(true);
    setError(null);

    try {
      const endpoint =
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload =
        mode === "signup"
          ? { displayName, email, password, church, inviteCode, ownerSetupKey }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        user?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setError(data.error || "Could not complete request.");
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex items-center justify-center bg-[#FAF7F2] dark:bg-[#141210] px-4 py-8 sm:py-10">
      <div className="w-full max-w-md rounded-3xl bg-[#FDFCFA] dark:bg-[#1D1A17] border border-[#E6DCCB] dark:border-[#2F2A24] p-6 sm:p-9 shadow-xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <LampTitleLockup size="md" subtitle="BIBLE STUDY & WORD NOTES" />
          <p className="font-serif italic text-sm text-[#6B635B] dark:text-[#A39A90] mt-3">
            &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo; — Psalm 119:105
          </p>
        </div>

        {userCount === 0 && (
          <div className="rounded-2xl bg-[#F7EAD0]/65 dark:bg-[#33281A] border border-[#E5CCA0] dark:border-[#4B3A23] p-3.5 text-xs text-[#5F4114] dark:text-[#E8C98F] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#9A6B24] dark:text-[#DFB164]" />
            <span>
              <strong>Welcome!</strong> Create the first profile below — it becomes the Owner account and automatically keeps all your existing notes &amp; highlights.
            </span>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 rounded-2xl bg-[#F2ECE1] dark:bg-[#141210] p-1 border border-[#E6DCCB] dark:border-[#2F2A24]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition ${
              mode === "login"
                ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] shadow-sm"
                : "text-[#6B635B] dark:text-[#A39A90]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition ${
              mode === "signup"
                ? "bg-[#1C1917] text-[#FAF7F2] dark:bg-[#DFB164] dark:text-[#141210] shadow-sm"
                : "text-[#6B635B] dark:text-[#A39A90]"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {googleAuthEnabled && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-[#141210] border border-[#DFD5C5] dark:border-[#36302A] hover:border-[#9A6B24] text-[#1C1917] dark:text-[#F5F0E8] font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2.5 transition"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l4-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l4 3.1c.94-2.84 3.59-4.95 6.71-4.95z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#8C8278]">
              <span className="h-px flex-1 bg-[#E6DCCB] dark:bg-[#2F2A24]" />
              <span>or with email</span>
              <span className="h-px flex-1 bg-[#E6DCCB] dark:bg-[#2F2A24]" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Nick"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
              Password {mode === "signup" && "(min. 6 characters)"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
                Church or Small Group (optional)
              </label>
              <div className="relative">
                <Church className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={church}
                  onChange={(e) => setChurch(e.target.value)}
                  placeholder="e.g. Grace Community Church"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                />
              </div>
            </div>
          )}

          {mode === "signup" && ownerSetupRequired && userCount === 0 && (
            <div>
              <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
                Owner Setup Key
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={ownerSetupKey}
                  onChange={(e) => setOwnerSetupKey(e.target.value)}
                  placeholder="Enter one-time OWNER_SETUP_KEY"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                />
              </div>
            </div>
          )}

          {mode === "signup" && inviteRequired && (
            <div>
              <label className="text-xs font-medium text-[#6B635B] dark:text-[#A39A90] block mb-1">
                Invite Code
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 text-[#8C8278] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter group invite code"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFD5C5] dark:border-[#36302A] bg-white dark:bg-[#141210] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#B88435]/50"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-[#9A6B24] hover:bg-[#7B531A] text-white font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "signup" ? "Creating Profile..." : "Signing In..."}
              </>
            ) : mode === "signup" ? (
              "Create Free Profile"
            ) : (
              "Sign In to Lamp"
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-[#8C8278]">
          Each profile has its own private study library, sermon notes, Bible highlights, and margin notes.
        </p>
      </div>
    </div>
  );
}
