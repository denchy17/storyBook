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
- **Prisma + SQLite** for the database — a single `prisma/dev.db` file, no
  external database service
- **Custom JWT auth** (jose + bcrypt, httpOnly cookie sessions)
- **react-pageflip** for the book reader, **pdf-lib** for PDF export
- Local file storage under `./storage`, served through an authenticated route

The app owns its own data: everything it needs is the SQLite file plus the
`./storage` folder sitting next to it. There is no Supabase (or any other
hosted backend) in the loop.

## Getting started

```bash
npm install
npx prisma migrate deploy   # creates prisma/dev.db
npm run seed                # creates a test account
npm run dev                 # http://localhost:3000
```

`npm run seed` prints the credentials it created. By default:

| | |
| --- | --- |
| email | `test@fable.app` |
| password | `fable1234` |

Pass your own to override (re-running just resets the password):

```bash
npm run seed -- me@example.com "my-long-password" "My Name"
```

Environment variables live in `.env` (copy `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file, e.g. `file:./dev.db` (relative to `prisma/`) |
| `STORAGE_DIR` | Where images/audio/uploads are written (default `./storage`) |
| `AUTH_SECRET` | Signs session JWTs |
| `GEMINI_API_KEY` | Nano Banana 2 (Google Gemini) |
| `ANTHROPIC_API_KEY` | Claude Sonnet 4.6 |
| `ELEVENLABS_API_KEY` | Narration |
| `ELEVENLABS_VOICE_ID` | Default narrator voice |

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

- `npm run seed` — create/reset a test account.
- `npm run users` — list the accounts in the database.
- `node --env-file=.env scripts/smoke-ai.mjs` — quick check that all three AI
  APIs / model IDs work.
- `node scripts/e2e.mjs` — registers a user, creates a book, and watches the
  full pipeline to completion against the running dev server.
- `node --env-file=.env scripts/dump-sqlite.mjs` — JSON dump of the database.

## Deploying

The database and the asset storage are both **files on the server's disk**, so
the app needs a host with a persistent, writable filesystem and a single
long-lived Node process — `npm run build && npm start` on a VPS, a Docker
container with `./storage` and `prisma/dev.db` on a volume, Fly.io, Render, etc.
The in-process job runner (`src/lib/jobs.ts`) assumes the same thing.

> **Netlify:** the current `netlify.toml` still builds, but Netlify's serverless
> functions get a read-only filesystem and a fresh container per invocation, so
> SQLite writes and `./storage` uploads will **not** persist there. Deploy to a
> persistent host, or swap `src/lib/storage.ts` + the Prisma datasource for a
> hosted blob store and database. Whichever you pick, update the site's env vars
> to match `.env.example` (any leftover `SUPABASE_*` / `DIRECT_URL` values and a
> Postgres `DATABASE_URL` will now break startup — the datasource is `sqlite`).

## Notes & next steps

- MVP scope: exactly two characters (a child + a parent) and 10 page pairs.
- Storage keys (`books/<id>/pages/3.png`, `uploads/<userId>/...`) are resolved
  through `resolveKey()` in `src/lib/storage.ts`, which pins every path inside
  `STORAGE_DIR` — they come from user-controlled URL segments, so keep that
  guard in place if you change the storage backend.
