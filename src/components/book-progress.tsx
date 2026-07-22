"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BookDTO } from "@/lib/serialize";
import { Button, LinkButton } from "./ui";
import {
  ArrowRightIcon,
  BookIcon,
  DownloadIcon,
  FeatherIcon,
  SparkleIcon,
  SpinnerIcon,
  VolumeIcon,
} from "./icons";

const MILESTONES = [
  { at: 4, icon: FeatherIcon, label: "Writing the story" },
  { at: 18, icon: SparkleIcon, label: "Designing the characters" },
  { at: 22, icon: BookIcon, label: "Illustrating each page" },
  { at: 70, icon: VolumeIcon, label: "Recording the narration" },
];

export function BookProgress({ initial }: { initial: BookDTO }) {
  const [book, setBook] = useState(initial);

  useEffect(() => {
    if (book.status !== "GENERATING") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/books/${book.id}`);
        if (res.ok) {
          const data = await res.json();
          setBook(data.book);
        }
      } catch {
        /* ignore */
      }
    }, 2500);
    return () => clearInterval(t);
  }, [book.status, book.id]);

  async function retry() {
    setBook((b) => ({ ...b, status: "GENERATING", stage: "Queued", progress: 1 }));
    await fetch(`/api/books/${book.id}/retry`, { method: "POST" });
  }

  if (book.status === "READY") {
    return (
      <div className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-card shadow-[0_30px_70px_-50px_rgba(42,35,32,0.5)]">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative aspect-square bg-paper-2 md:aspect-auto">
            {book.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" />
              Ready to read
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">
              {book.title}
            </h1>
            {book.dedication && (
              <p className="mt-2 text-sm italic text-ink-soft">
                {book.dedication}
              </p>
            )}
            <p className="mt-4 text-sm text-ink-soft">
              Ten illustrated spreads, one consistent style, and a warm voice to
              read it aloud.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href={`/book/${book.id}/read`} size="lg">
                Open the book
                <ArrowRightIcon className="h-5 w-5" />
              </LinkButton>
              <a
                href={`/api/books/${book.id}/pdf`}
                className="inline-flex h-13 items-center gap-2 rounded-full border border-line bg-card px-6 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:bg-paper-2"
              >
                <DownloadIcon className="h-5 w-5" />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (book.status === "FAILED") {
    return (
      <div className="rounded-3xl border border-accent/30 bg-accent-soft/30 p-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Something interrupted the magic
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          {book.errorMessage ??
            "The generation didn't finish. You can try again — your details are saved."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={retry}>Try again</Button>
          <LinkButton href="/dashboard" variant="outline">
            Back to library
          </LinkButton>
        </div>
      </div>
    );
  }

  // GENERATING
  return (
    <div className="animate-fade-up rounded-3xl border border-line bg-card p-8 shadow-[0_30px_70px_-50px_rgba(42,35,32,0.5)] sm:p-12">
      <div className="flex flex-col items-center text-center">
        <div className="relative grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-line" />
          <SpinnerIcon className="h-10 w-10 text-accent" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink">
          {book.stage}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hang tight — crafting a personal book takes a few minutes. This page
          updates itself.
        </p>

        <div className="mt-8 w-full max-w-md">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-2">
            <div
              className="relative h-full rounded-full bg-accent transition-all duration-700 ease-out shimmer"
              style={{ width: `${Math.max(5, book.progress)}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-medium text-muted">
            {book.progress}%
          </p>
        </div>

        <div className="mt-8 grid w-full max-w-md gap-2">
          {MILESTONES.map((m) => {
            const active = book.progress >= m.at;
            return (
              <div
                key={m.label}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-forest/30 bg-forest/5"
                    : "border-line bg-paper-2/30"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full ${
                    active ? "bg-forest/15 text-forest" : "bg-card text-muted"
                  }`}
                >
                  <m.icon className="h-4 w-4" />
                </span>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>

        <Link
          href="/dashboard"
          className="mt-8 text-sm font-medium text-ink-soft hover:text-ink"
        >
          You can safely leave — we&apos;ll keep working.
        </Link>
      </div>
    </div>
  );
}
