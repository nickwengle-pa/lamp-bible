# Vessel — Self-Hosted Bible Study & Sermon Notes Web App

A clean, free, self-hosted clone of **Vessel: Bible Study & Notes** built with Next.js, Tailwind CSS, and Google Gemini AI.

## Features
- **Live Sermon Recorder & AI-Structured Notes**: Record audio live with a real-time waveform visualizer (or upload audio files), take timestamped notes simultaneously, and let Gemini AI organize everything into themes, outlines, clickable scripture references, actionable takeaways, and reflection questions.
- **YouTube Sermon Summarizer**: Paste any YouTube sermon link to automatically extract metadata/transcripts and generate a full structured study guide.
- **Bible Reader + Contextual Verse Insights**: Full 66-book Bible reader (WEB, KJV, ASV, BBE) with chapter/book navigation and quick-jump search. Tap any verse to see its historical context, intended audience, original Hebrew/Greek word study, cross-references, life application, and prayer prompt.
- **Instant Scripture Scanner**: Point your phone/webcam camera at a printed Bible page (or upload a photo) to detect the exact passage, jump straight to it in the Bible Reader, and save instant study notes.
- **Searchable Study Library**: All notes are saved locally in `data/library.json` with full-text search, source filters, pinning, checkable takeaways, personal reflection journaling, Markdown copy, and JSON backup export.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **Add Free Gemini Key** in the sidebar (or set `GEMINI_API_KEY` in `.env.local`), and get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
