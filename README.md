# Lamp — Bible Word Study & Sermon Notes

> *"Your word is a lamp to my feet and a light to my path."* — Psalm 119:105

A free, self-hosted AI Bible study & sermon note-taking web app running on Cloudflare Workers + KV with Google Gemini AI, Crossway ESV API, API.Bible (NIV, NLT, NASB), Berean Standard Bible (BSB), Berean Interlinear, and Strong's / BDB / Thayer's Lexicons.

## Features
- **Bible Reader (ESV, NIV, NLT, NASB, BSB, WEB, KJV, ASV, BBE):** Starts at John 1:1 right on the main screen plus full-screen mode. Tap any verse for inline text highlights, margin notes (gold star badge), linked sermon/study badges, **Share Scripture Quote Cards (PNG + native share)**, and a 4-tab study bar (**Explain · Original Word-by-Word Interlinear · Deep Study · Related & Ask Lamp**).
- **Word Study & Guided Study Builder:** Curated Hebrew/Greek Word Cards (*Logos*, *Chesed*, *Agapē*, *Shalom*, *Charis*, *Menō*, etc.) with native Greek/Hebrew audio pronunciation, live Strong's/English lexicon search, plus guided pathways (*Study a Passage*, *Create a Lesson / Sermon*, *Struggling With Something*).
- **Live Sermon Recorder (60+ min):** Screen Wake Lock, live Speech-to-Text captions, compressed 24kbps voice Opus, preserved recording state across tab navigation, and Gemini Files API upload for full Sunday services.
- **YouTube Sermon Summarizer & Instant Scripture Scanner:** Paste any YouTube teaching link (with full-length multi-section digestion for long sermons) or snap a photo of a printed Bible page.
- **Multi-User Private Profiles & Cloud Sync:** Each user gets their own password-protected profile (PBKDF2-SHA256 + `HttpOnly` signed session cookie), isolated Cloudflare KV study library, Series folders, checkable takeaways, Ask Lamp follow-up chat, and JSON/Markdown export.

## Development & Deployment (Cloudflare Workers)
```bash
npm run dev        # Local Cloudflare Workers dev server (vinext)
npm run typecheck  # TypeScript strict check
npm run build      # Build Cloudflare Workers production bundle
npm run deploy     # Deploy prebuilt bundle with .env.local secrets
```

Optional Worker secrets in `.env.local`:
- `SESSION_SECRET` — HMAC secret for signing session cookies
- `OWNER_SETUP_KEY` — One-time credential required to initialize the first Owner account and migrate legacy single-user data
- `GEMINI_API_KEY` — Google AI Studio API key (optional `GEMINI_MODEL` for server default)
- `ESV_API_KEY` — Crossway ESV API token (free keyless BSB is used automatically when omitted)
- `API_BIBLE_KEY` — API.Bible key for NIV, NLT, and NASB 2020
