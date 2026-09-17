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
- **Prisma + Postgres** for the database — hosted on Supabase
- **Custom JWT auth** (jose + bcrypt, httpOnly cookie sessions)
- **react-pageflip** for the book reader, **pdf-lib** for PDF export
- Asset storage through an authenticated route — Netlify Blobs when deployed,
  the local `./storage` folder during development

## Getting started

Point `DATABASE_URL` / `DIRECT_URL` at the Postgres database first (Supabase
project `uyrfcalhxdycufhrmeyh`); any Postgres will do.

```bash
npm install
cp .env.example .env        # then fill in the connection strings + API keys
npx prisma migrate deploy   # creates the schema
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
| `DATABASE_URL` | Postgres, pooled connection string |
| `DIRECT_URL` | Postgres, unpooled — used by `prisma migrate` only |
| `STORAGE_DIR` | Local dev only: where assets are written (default `./storage`) |
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

Netlify functions get a read-only filesystem and a fresh container per
invocation, so nothing the app writes locally survives the request. Both stores
therefore live off-box:

- **Database** — hosted Postgres on [Supabase](https://supabase.com).
  `DATABASE_URL` is the transaction-pooler string (port 6543, needs
  `?pgbouncer=true&connection_limit=1`), `DIRECT_URL` the direct one (port 5432)
  that `prisma migrate` needs for its advisory lock.
- **Assets** — [Netlify Blobs](https://docs.netlify.com/blobs/overview/), which
  needs no credentials: `@netlify/blobs` picks the site up from the function
  runtime. `src/lib/storage.ts` falls back to the filesystem under
  `STORAGE_DIR` when `NETLIFY` is unset, so `npm run dev` still works unchanged.

### Setting up the site

1. Restore the Supabase project and copy both connection strings.
2. In **Site configuration → Environment variables**, set everything in
   `.env.example`: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and the three AI
   keys. Delete any leftover `SUPABASE_*` values.
3. Deploy. The build does *not* run migrations — apply schema changes with
   `npx prisma migrate deploy` from a laptop.
4. Seed a login if the database is empty: `npm run seed` with `.env` pointed at
   the same database.

> **Book generation does not work on Netlify yet.** `POST /api/books` returns as
> soon as the row is written and leaves `runBookGeneration` running in the
> background via the in-process queue in `src/lib/jobs.ts`. Netlify freezes the
> container once the response is sent, so generation dies partway and the book
> stays stuck in `GENERATING`. Signing in, the library and reading finished
> books all work; generating a new one needs that pipeline moved to a
> [background function](https://docs.netlify.com/functions/background-functions/)
> (15-minute cap) or an external queue.

## Notes & next steps

- MVP scope: exactly two characters (a child + a parent) and 10 page pairs.
- Storage keys (`books/<id>/pages/3.png`, `uploads/<userId>/...`) go through
  `normalizeKey()` in `src/lib/storage.ts` before either backend sees them. They
  come from user-controlled URL segments, so keep that guard: on disk a raw join
  is a path-traversal hole, and the ownership check in `/api/files/[...path]`
  reads the owner out of the key itself, so it has to see the canonical form.
