# Fable — Personalized illustrated storybooks

Fable turns the people you love into the heroes of a beautifully illustrated,
narrated storybook. A user fills in a short brief (book type + a child and a
parent, with optional photos), and the app:

1. **Writes the story** with **Claude Sonnet 4.6** — 10 pages of text plus a
   matching illustration prompt per page, a consistent art‑direction paragraph,
   and a "character sheet" prompt.
2. **Illustrates it** with **Nano Banana 2** (`gemini-3.1-flash-image`, 1K):
   - First it generates ONE **reference/anchor image** containing all characters
     (using the uploaded photos for face fidelity).
   - That anchor image is then reused as a reference for every page so the **art
     style and the faces stay perfectly consistent** across the whole book.
3. **Narrates it** with **ElevenLabs** — one audio clip per page, generated once
   and stored/reused (no re‑synthesis, to keep token costs down).

The finished book can be read in‑app as a **realistic page‑flip book** (with
swipe/keyboard/auto‑turn narration) and **downloaded as a PDF**.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — warm, editorial design system (SVG icons, no emojis)
- **Prisma + SQLite** for the database (local now, easy to move to Supabase later)
- **Custom JWT auth** (jose + bcrypt, httpOnly cookie sessions)
- **react-pageflip** for the book reader, **pdf-lib** for PDF export
- Local file storage under `./storage`, served through an authenticated route

## Getting started

```bash
npm install
npx prisma migrate dev      # creates prisma/dev.db
npm run dev                 # http://localhost:3000
```

Environment variables live in `.env` (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite path (swap for Postgres/Supabase later) |
| `AUTH_SECRET` | Signs session JWTs |
| `GEMINI_API_KEY` | Nano Banana 2 (Google Gemini) |
| `ANTHROPIC_API_KEY` | Claude Sonnet 4.6 |
| `ELEVENLABS_API_KEY` | Narration |
| `ELEVENLABS_VOICE_ID` | Default narrator voice |
| `STORAGE_DIR` | Where images/audio/uploads are written |

> **Security:** the API keys were shared in plaintext during setup. Rotate them
> before this goes anywhere public. Never commit `.env` (it is gitignored).

## How it fits together

```
src/
  app/
    page.tsx                     Landing
    login / register             Auth pages
    dashboard                    Library (live-updating grid)
    create                       Personalization wizard
    book/[id]                    Generation progress + ready screen
    book/[id]/read               Page-flip reader + narration
    api/
      auth/*                     register / login / logout / me
      books                      GET list · POST create (multipart + photos)
      books/[id]                 GET details · DELETE
      books/[id]/pdf             PDF export
      books/[id]/retry           Re-run a failed generation
      files/[...path]            Auth-gated file serving
  lib/
    ai/claude.ts                 Story + prompt generation
    ai/nanobanana.ts             Image generation (reference-anchor pipeline)
    ai/elevenlabs.ts             Text-to-speech
    pipeline.ts                  Orchestrates the whole generation
    jobs.ts                      In-process concurrency-limited job runner
    auth.ts / db.ts / storage.ts Core services
```

Generation runs as a background job (multiple users/books at once, capped
concurrency). The frontend polls the book's status and shows live progress.

## Dev utilities

- `node --env-file=.env scripts/smoke-ai.mjs` — quick check that all three AI
  APIs / model IDs work.
- `node scripts/e2e.mjs` — registers a user, creates a book, and watches the
  full pipeline to completion against the running dev server.

## Notes & next steps

- MVP scope: exactly two characters (a child + a parent) and 10 page pairs.
- Moving to Supabase: switch the Prisma `datasource` provider to `postgresql`,
  and move file storage from `./storage` to Supabase Storage.
