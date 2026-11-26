# Lamp — Bible Word Study & Sermon Notes

> *"Your word is a lamp to my feet and a light to my path."* — Psalm 119:105

A free, self-hosted AI Bible study & sermon note-taking web app running on Cloudflare Workers + KV with Google Gemini AI, Crossway ESV API, Berean Standard Bible (BSB), Berean Interlinear, and Strong's / BDB / Thayer's Lexicons.

## Features
- **Bible Reader (ESV, BSB, WEB, KJV, ASV, BBE):** Starts at John 1:1 right on the main screen plus full-screen mode. Tap any verse for color highlights, margin notes, **Share Scripture Quote Cards (PNG + native share)**, cross-linked sermon badges, and a 4-tab study bar (**Explain · Original Word-by-Word Interlinear · Deep Study · Related & Ask Lamp**).
- **Word Study & Guided Study Builder:** Swipeable Hebrew/Greek Word Cards (*Logos*, *Chesed*, *Agape*, *Shalom*, *Charis*, *Meno*, etc.) with audio pronunciation, live Strong's/English lexicon search, plus guided pathways (*Study a Passage*, *Create a Lesson / Sermon*, *Struggling With Something*).
- **Live Sermon Recorder (60+ min):** Screen Wake Lock, live Speech-to-Text captions, compressed 24kbps voice Opus, and Gemini Files API upload for full Sunday services.
- **YouTube Sermon Summarizer & Instant Scripture Scanner:** Paste any YouTube teaching link or snap a photo of a printed Bible page.
- **Cloud-Synced Study Library & Privacy Passcode Lock:** Synced via Cloudflare KV with Series folders, checkable takeaways, Ask Lamp follow-up chat, Markdown export, and optional SHA-256 PIN lock.
