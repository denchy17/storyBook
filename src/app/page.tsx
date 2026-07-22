import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { BOOK_TYPES } from "@/lib/book-types";
import { SiteHeader } from "@/components/site-header";
import { LinkButton } from "@/components/ui";
import {
  ArrowRightIcon,
  BookIcon,
  FeatherIcon,
  SparkleIcon,
  VolumeIcon,
} from "@/components/icons";

const STEPS = [
  {
    icon: FeatherIcon,
    title: "Tell us your story",
    body: "Add the child and the parent, upload a photo of each, and answer a few gentle prompts.",
  },
  {
    icon: SparkleIcon,
    title: "We craft & illustrate",
    body: "A story is written to fit your people, then illustrated in one consistent, hand-made style.",
  },
  {
    icon: VolumeIcon,
    title: "Read, hear & keep it",
    body: "Flip through it like a real book, let the narrator read aloud, or download a print-ready PDF.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const startHref = user ? "/create" : "/register";

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader user={user} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-ink-soft">
                <SparkleIcon className="h-3.5 w-3.5 text-accent" />
                Personalized, illustrated & narrated
              </span>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                The people you love,
                <br />
                <span className="text-accent">as the heroes</span> of their
                own story.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                Fable turns a child and their parent into a beautifully
                illustrated storybook — written for them, drawn in one
                consistent style, and read aloud in a warm voice.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <LinkButton href={startHref} size="lg">
                  Create your book
                  <ArrowRightIcon className="h-5 w-5" />
                </LinkButton>
                <Link
                  href="#how"
                  className="rounded-full px-5 py-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  See how it works
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted">
                Ten hand-illustrated spreads · Consistent faces & style ·
                Downloadable PDF
              </p>
            </div>

            <HeroBook />
          </div>
        </section>

        {/* Book types */}
        <section className="border-y border-line/70 bg-paper-2/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                  A book for every kind of love
                </h2>
                <p className="mt-2 max-w-xl text-ink-soft">
                  Choose a direction — we shape the tone, art style, and story
                  around it.
                </p>
              </div>
            </div>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {BOOK_TYPES.map((t) => (
                <div
                  key={t.id}
                  className="group rounded-2xl border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_24px_50px_-30px_rgba(42,35,32,0.4)]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
                    <BookIcon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-xs font-medium uppercase tracking-wider text-accent">
                    {t.tagline}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-semibold text-ink">
                    {t.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {t.blurb}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Three steps to a story they&apos;ll keep
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-card text-accent">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-line">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center text-paper">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(600px 300px at 50% 0%, rgba(191,90,52,0.6), transparent 70%)",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight">
                Make someone the hero of a story tonight.
              </h2>
              <div className="mt-8 flex justify-center">
                <LinkButton href={startHref} size="lg">
                  Start creating
                  <ArrowRightIcon className="h-5 w-5" />
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 text-sm text-muted">
          <span>Fable</span>
          <span>Crafted with care, illustrated by hand-tuned AI.</span>
        </div>
      </footer>
    </div>
  );
}

function HeroBook() {
  return (
    <div className="relative animate-fade-up [animation-delay:120ms]">
      <div className="relative mx-auto aspect-4/3 w-full max-w-lg">
        <div className="absolute inset-0 -rotate-2 rounded-2xl border border-line bg-card book-shadow" />
        <div className="absolute inset-0 rotate-1 overflow-hidden rounded-2xl border border-line bg-card book-shadow paper-texture">
          <div className="grid h-full grid-cols-2">
            <div className="relative border-r border-line/60 bg-gradient-to-br from-accent-soft to-paper-2">
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 h-full w-full text-accent/70"
                fill="none"
              >
                <circle cx="150" cy="55" r="26" stroke="currentColor" strokeWidth="2" />
                <path d="M20 170c20-45 55-70 95-70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M40 175c10-30 30-50 60-58" stroke="var(--color-forest)" strokeWidth="2" strokeLinecap="round" />
                <path d="M60 120c8-6 18-6 26 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="70" cy="95" r="3" fill="currentColor" />
                <circle cx="92" cy="95" r="3" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col justify-center gap-3 p-7">
              <div className="h-2.5 w-3/4 rounded-full bg-line" />
              <div className="h-2.5 w-full rounded-full bg-line/70" />
              <div className="h-2.5 w-5/6 rounded-full bg-line/70" />
              <div className="h-2.5 w-2/3 rounded-full bg-line/70" />
              <div className="mt-3 h-2.5 w-1/2 rounded-full bg-accent/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
