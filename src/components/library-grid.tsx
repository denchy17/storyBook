"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BookDTO } from "@/lib/serialize";
import { Button, LinkButton } from "./ui";
import {
  ArrowRightIcon,
  BookIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
} from "./icons";

function StatusPill({ book }: { book: BookDTO }) {
  if (book.status === "READY")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
        <span className="h-1.5 w-1.5 rounded-full bg-forest" />
        Ready
      </span>
    );
  if (book.status === "FAILED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-hover">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">
      <SpinnerIcon className="h-3 w-3" />
      Creating {book.progress}%
    </span>
  );
}

export function LibraryGrid({ initialBooks }: { initialBooks: BookDTO[] }) {
  const [books, setBooks] = useState(initialBooks);

  const anyGenerating = books.some((b) => b.status === "GENERATING");

  useEffect(() => {
    if (!anyGenerating) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/books");
        if (res.ok) {
          const data = await res.json();
          setBooks(data.books);
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [anyGenerating]);

  async function remove(id: string) {
    if (!confirm("Delete this book permanently?")) return;
    setBooks((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/books/${id}`, { method: "DELETE" });
  }

  if (books.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-card/60 px-8 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <BookIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-6 font-display text-2xl font-semibold text-ink">
          Your library is waiting
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          Create your first personalized storybook — it takes just a few
          answers and a couple of photos.
        </p>
        <div className="mt-7 flex justify-center">
          <LinkButton href="/create" size="lg">
            <PlusIcon className="h-5 w-5" />
            Create a book
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        href="/create"
        className="group grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-card/50 transition-colors hover:border-accent/50 hover:bg-card"
      >
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent transition-transform group-hover:scale-110">
            <PlusIcon className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium text-ink">New book</p>
        </div>
      </Link>

      {books.map((book) => (
        <div
          key={book.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-38px_rgba(42,35,32,0.5)]"
        >
          <div className="relative aspect-4/3 overflow-hidden bg-paper-2">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-accent-soft to-paper-2 text-accent/50">
                <BookIcon className="h-10 w-10" />
              </div>
            )}
            <div className="absolute left-3 top-3">
              <StatusPill book={book} />
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              {book.styleName}
            </p>
            <h3 className="mt-1 line-clamp-2 font-display text-xl font-semibold text-ink">
              {book.title}
            </h3>

            <div className="mt-auto flex items-center justify-between pt-5">
              {book.status === "READY" ? (
                <LinkButton href={`/book/${book.id}/read`} size="sm">
                  Open book
                  <ArrowRightIcon className="h-4 w-4" />
                </LinkButton>
              ) : (
                <LinkButton href={`/book/${book.id}`} variant="outline" size="sm">
                  {book.status === "FAILED" ? "View" : "View progress"}
                </LinkButton>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete book"
                onClick={() => remove(book.id)}
                className="px-2 text-muted hover:text-accent"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
