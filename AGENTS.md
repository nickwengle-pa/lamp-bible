# Lamp (lamp119.app) — Antigravity Project Instructions

> *"Your word is a lamp to my feet and a light to my path."* — Psalm 119:105

## Project Overview
- **Product Name:** Lamp (`lamp119.app` / `www.lamp119.app`)
- **Purpose:** 100% free (\$0/month), non-commercial, self-hosted Bible study, original-language (Hebrew & Greek) word study, and sermon-notes PWA.
- **Stack:** Next.js 15 App Router built with `vinext` (`vite build`) and deployed to **Cloudflare Workers + Cloudflare KV** using `cf` CLI (`cloudflare.config.ts`).
- **GitHub Repository:** `https://github.com/nickwengle-pa/lamp-bible` (branch `main`)
- **Cloudflare Account ID:** `d78c7bb112c3acb8e8567031af9e9ab8`
- **Cloudflare Worker Name:** `lamp-bible`
- **Cloudflare KV Namespace:** binding `VESSEL_NOTES` → ID `32984e81f3184120950bb08043a327c9`
- **Live Domains:** `https://lamp119.app`, `https://www.lamp119.app`
- **Google Cloud OAuth Project:** `pl-donations` (`pl-donations-351d6`), OAuth client `LAMP` (`10708041535-v3l1aj3d0d78mg64d1892jogid7gu34p.apps.googleusercontent.com`)

## Hard Constraints (Always Enforce)
1. **\$0/Month Free Tier:** Keep all infrastructure, Bible APIs, and AI usage on free tiers. Never introduce paid subscriptions or commercial tracking.
2. **Never Commit Secrets:** `.env.local` is gitignored and holds the 6 production Worker secrets (`GEMINI_API_KEY`, `ESV_API_KEY`, `API_BIBLE_KEY`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Never commit `.env.local` or print secret values in responses.
3. **Always Preserve Worker Secrets on Deploy:** Always deploy using:
   ```powershell
   npm run build
   cf deploy --prebuilt --secrets-file .env.local
   ```
   Never run `cf deploy` without `--secrets-file .env.local`, or Cloudflare Worker secrets will be dropped.
4. **Preserve All Existing User KV Data:** Never break, wipe, or migrate destructively across KV keys (`lamp_user_rec_*`, `lamp_u_*_note_*`, `lamp_u_*_hl_*`, `lamp_theology_custom_v1`).
5. **Strict Owner-Only Isolation:** Regular members (`role !== "admin"`) must never see or modify API keys, Registered Members management, invite codes, or custom Church Statement of Faith / Theology instructions (enforce on both server routes and UI).
6. **Theological Guardrails (`src/lib/theology.ts`):**
   - Primary tradition: **Assemblies of God / Classical Pentecostal** + **Wesleyan-Arminian** (explicitly non-Calvinist: conditional election, universal atonement, resistible grace, genuine human responsibility) + **Historical-Grammatical Hermeneutics**.
   - Teach clearly from this primary stance while charitably noting other faithful evangelical views on secondary non-essential issues.
   - All AI routes must use `buildEffectiveTheologySystemInstruction()` so Owner Statement of Faith rules apply everywhere.
   - Verify any theology prompt changes with `npm run test:theology` (25-question suite).
7. **Security & Auth Gates:** Every `/api/ai/*`, `/api/notes*`, and `/api/highlights*` route must enforce `getSessionUser(request)` upfront and return `401` when unauthenticated.

## Architecture & Key Files
- `cloudflare.config.ts` — Cloudflare Workers config, KV binding, and `domains: ["lamp119.app", "www.lamp119.app"]`
- `src/lib/auth.ts` — PBKDF2-SHA256 auth, HMAC-SHA256 `HttpOnly` session cookies, Google OAuth user provisioning, member listing/removal
- `src/lib/storage.ts` — Per-record KV storage for notes & highlights, serialized write queues, default gold highlight seeding on `Psalms:119:105`
- `src/lib/theology.ts` — Theological charter + Owner-only KV-backed Church Statement of Faith
- `src/lib/lexicon-grounding.ts` — Fetches real BSB interlinear & Strong's/BDB/Thayer's lexicon data prior to Gemini calls
- `src/lib/verse-of-the-day.ts` — Curated daily rotating Verse of the Day (48 verses)
- `src/components/VesselApp.tsx` — Main app shell, auth bootstrap, mobile bottom nav & `☰` menu, persistent recorder banner
- `src/components/LibraryView.tsx` — Home greeting, Asymmetric Lantern Glow Bento launchpad (with daily Verse of the Day hero), collapsible Study Library & Series drawer with 7 category filters
- `src/components/BibleReaderView.tsx` — 9-translation Bible reader, inline highlights/margin notes, 4-tab Verse Study drawer with mobile swipe-down/up sheet & floating bottom tab
- `src/components/WordStudyView.tsx` — Original-language word cards, native Greek/Hebrew audio pronunciation (`/api/pronounce`), Strong's lexicon search, Guided Study Builder
- `src/components/SermonRecorderView.tsx` — Live 60+ min sermon recorder with Wake Lock, captions, and Gemini Files API summarization
- `src/components/AuthScreen.tsx` — Email/password (full password-manager autofill metadata) + Google OAuth 2.0 sign-in + `/privacy` link
- `src/components/SettingsModal.tsx` — User profile, Beginner's Guide trigger, and Owner-only API keys, Invite Code, Registered Members directory, and AI Theology / Statement of Faith editor
- `src/components/OnboardingGuideModal.tsx` — 7-screen interactive first-login walkthrough
- `src/app/privacy/page.tsx` — Public Privacy Policy page (`https://lamp119.app/privacy`)
- `scripts/theology-eval.mjs` — Automated 25-question theological evaluation harness (`npm run test:theology`)

## Standard Verification & Release Workflow
1. Run `npm run typecheck` (must pass with `0` errors).
2. Run `npm run build` (`vite build` for Cloudflare Workers).
3. Commit cleanly to `main` (never stage `.env.local`).
4. Deploy live: `cf deploy --prebuilt --secrets-file .env.local` and verify all 6 hidden secrets + `lamp119.app` / `www.lamp119.app` custom domains are attached.
5. Push to GitHub: `git push origin main`.
