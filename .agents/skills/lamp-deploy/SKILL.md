---
name: lamp-deploy
description: >-
  Safely typecheck, build, commit, deploy, and live-verify the Lamp Bible app
  (lamp119.app) on Cloudflare Workers without dropping production secrets or
  breaking existing user KV data. Use whenever the user asks to ship, publish,
  or deploy changes to Lamp.
---

# Lamp Safe Deploy Runbook (`lamp119.app`)

Follow these steps in order for every release to **https://lamp119.app**:

## 1. Verify TypeScript & Build (Sandboxed)
```powershell
npm run typecheck
npm run build
```
- Fix all TypeScript errors (`tsc --noEmit` must exit `0`) before building or deploying.
- If `src/lib/theology.ts` or any AI prompt changed, also run `npm run test:theology` and verify all 25/25 questions pass.

## 2. Commit Cleanly (Never Stage Secrets)
- Confirm `.env.local` is untracked/ignored (`git status --short`).
- Stage only intended source/config files and commit to `main`.

## 3. Deploy to Cloudflare Workers With All 6 Secrets
```powershell
cf deploy --prebuilt --secrets-file .env.local
```
- **CRITICAL:** Always pass `--secrets-file .env.local`. Deploying without it drops production Worker secrets.
- Verify the deploy output shows:
  - KV binding `env.VESSEL_NOTES (32984e81f3184120950bb08043a327c9)`
  - All 6 hidden secrets (`GEMINI_API_KEY`, `ESV_API_KEY`, `API_BIBLE_KEY`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
  - Custom domains `lamp119.app` and `www.lamp119.app`

## 4. Push to GitHub & Live-Check
```powershell
git push origin main
```
- When auth, routing, or custom-domain config changed, verify `https://lamp119.app` and `https://lamp119.app/api/auth/me` return `200 OK` with `googleAuthEnabled: true`.
