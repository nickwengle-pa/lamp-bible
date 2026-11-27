# Lamp — Bible Word Study & Sermon Notes (`lamp119.app`)

> *"Your word is a lamp to my feet and a light to my path."* — Psalm 119:105

A free (\$0/month), self-hosted Bible study, original-language word study, and sermon-notes PWA running on **Cloudflare Workers + KV** at **[https://lamp119.app](https://lamp119.app)**.

## Features
- **Asymmetric Lantern Glow Home & Verse of the Day:** Opens with a daily rotating Verse of the Day hero card (tapping **Read →** jumps straight to and highlights that exact verse), quick launchpad tiles for every tool, a collapsible **My Study Library & Series** drawer with 7 category filters, and the Daily Bible Reader right below.
- **Bible Reader (9 Translations — ESV, NIV, NLT, NASB, BSB, WEB, KJV, ASV, BBE):** Tap any verse for inline highlights (with **Psalm 119:105** pre-highlighted in gold for every user), personal margin notes, linked sermon/study badges, **Share Scripture Quote Cards**, and a swipeable mobile **Verse Study** sheet (swipe down to hide into a bottom tab, swipe up to reopen, `X` to close) with 4 tabs: **Explain · Original Word-by-Word Interlinear · Deep Study · Related & Ask Lamp**.
- **Word Study & Guided Study Builder:** Curated Hebrew/Greek Word Cards with native audio pronunciation (`/api/pronounce`), live Strong's/BDB/Thayer's lexicon lookup, and guided study pathways.
- **Live Sermon Recorder (60+ min):** Screen Wake Lock, live Speech-to-Text captions, compressed voice audio, preserved state across tabs, and Gemini Files API summarization.
- **YouTube Sermon Summarizer & Instant Scripture Scanner:** Multi-section digestion for long YouTube teachings and camera page scanning for printed Bibles/handouts.
- **Multi-User Auth, Google Sign-In & Owner Controls:** Email/password (PBKDF2-SHA256 + `HttpOnly` HMAC cookies + full password-manager autofill) and **Continue with Google** OAuth 2.0, interactive 7-screen Beginner's Guide, public Privacy Policy (`/privacy`), and Owner-only Registered Members directory & Church Statement of Faith / AI Theology settings.

## Development & Deployment (Cloudflare Workers)
```powershell
npm run dev            # Local Cloudflare Workers dev server (vinext)
npm run typecheck      # TypeScript strict check
npm run build          # Build Cloudflare Workers production bundle
npm run deploy         # Deploy prebuilt bundle with .env.local secrets
npm run test:theology  # Run 25-question theological guardrail evaluation
```

## Required Worker Secrets (`.env.local`, gitignored)
- `SESSION_SECRET` — 256-bit HMAC secret for signing session cookies
- `GEMINI_API_KEY` — Google AI Studio API key (optional `GEMINI_MODEL` for server default)
- `ESV_API_KEY` — Crossway ESV API token (free keyless BSB is used automatically when omitted)
- `API_BIBLE_KEY` — API.Bible key for NIV, NLT, and NASB 2020
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` — Google OAuth 2.0 web client credentials for `lamp119.app`
- `OWNER_SETUP_KEY` *(optional)* — One-time setup key for initializing the first Owner account on a fresh deployment
