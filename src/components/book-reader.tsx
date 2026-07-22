"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import HTMLFlipBook from "react-pageflip";
import type { BookDTO } from "@/lib/serialize";
import { cn } from "@/lib/cn";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
} from "./icons";
import { LogoLink } from "./brand";

/* A single physical leaf of the book. react-pageflip requires each page to
   accept a forwarded ref. */
const Leaf = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; hard?: boolean }
>(({ children, className, hard }, ref) => (
  <div
    ref={ref}
    data-density={hard ? "hard" : "soft"}
    className={cn("h-full w-full overflow-hidden bg-card", className)}
  >
    {children}
  </div>
));
Leaf.displayName = "Leaf";

function Ornament() {
  return (
    <svg width="80" height="12" viewBox="0 0 80 12" fill="none" className="text-accent/50">
      <path d="M2 6h26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M52 6h26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M40 2l3 4-3 4-3-4 3-4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function BookReader({ book }: { book: BookDTO }) {
  const pages = book.pages;
  const lastStory = pages.length - 1;

  const flipRef = useRef<{ pageFlip: () => PageFlipApi }>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(0);
  const [narrating, setNarrating] = useState(false);
  const [autoTurn, setAutoTurn] = useState(true);
  const [dims, setDims] = useState({ w: 500, h: 500, portrait: false });
  const [audioPos, setAudioPos] = useState({ t: 0, d: 0 });

  const storyIndex = (() => {
    if (page < 1) return -1;
    const idx = Math.floor((page - 1) / 2);
    return idx <= lastStory ? idx : -1;
  })();

  useEffect(() => {
    // Defer flip-book mount to the client so refs and window are available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const portrait = vw < 900;
      const availH = vh - 200;
      const maxLeaf = 640;
      const leafW = portrait
        ? Math.min(vw - 32, maxLeaf)
        : Math.min(Math.min(vw - 48, 1320) / 2, maxLeaf);
      const leaf = Math.max(260, Math.floor(Math.min(leafW, availH, maxLeaf)));
      setDims({ w: leaf, h: leaf, portrait });
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const api = useCallback(() => flipRef.current?.pageFlip?.(), []);
  const flipNext = useCallback(() => api()?.flipNext(), [api]);
  const flipPrev = useCallback(() => api()?.flipPrev(), [api]);

  // Drive narration audio from the current spread.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const url = storyIndex >= 0 ? pages[storyIndex]?.audioUrl : null;

    if (!url) {
      el.pause();
      return;
    }
    if (el.dataset.idx !== String(storyIndex)) {
      el.src = url;
      el.dataset.idx = String(storyIndex);
      el.load();
    }
    if (narrating) {
      el.play().catch(() => setNarrating(false));
    } else {
      el.pause();
    }
  }, [storyIndex, narrating, pages]);

  const handleEnded = useCallback(() => {
    if (autoTurn && storyIndex >= 0 && storyIndex < lastStory) {
      flipNext();
    } else {
      setNarrating(false);
    }
  }, [autoTurn, storyIndex, lastStory, flipNext]);

  function toggleNarration() {
    if (storyIndex < 0) {
      flipNext();
      setNarrating(true);
      return;
    }
    setNarrating((n) => !n);
  }

  // Keyboard controls
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") flipNext();
      else if (e.key === "ArrowLeft") flipPrev();
      else if (e.key === " ") {
        e.preventDefault();
        toggleNarration();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipNext, flipPrev, storyIndex]);

  const totalLeaves = 2 + pages.length * 2;
  const progressPct = audioPos.d ? (audioPos.t / audioPos.d) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="[&_span]:text-paper">
          <LogoLink href="/dashboard" />
        </div>
        <div className="hidden text-center sm:block">
          <p className="font-display text-lg font-semibold">{book.title}</p>
          <p className="text-xs text-paper/50">{book.styleName}</p>
        </div>
        <a
          href={`/api/books/${book.id}/pdf`}
          className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 text-sm font-medium text-paper/90 transition-colors hover:bg-paper/10"
        >
          <DownloadIcon className="h-4 w-4" />
          <span className="hidden sm:inline">PDF</span>
        </a>
      </div>

      {/* Book stage */}
      <div className="flex flex-1 items-center justify-center px-3 py-2">
        {mounted && (
          <div className="book-shadow rounded-sm" style={{ perspective: 2400 }}>
            <HTMLFlipBook
              key={`${dims.w}-${dims.portrait}`}
              ref={flipRef}
              width={dims.w}
              height={dims.h}
              size="fixed"
              minWidth={260}
              maxWidth={680}
              minHeight={260}
              maxHeight={680}
              startPage={page}
              maxShadowOpacity={0.45}
              drawShadow
              flippingTime={800}
              showCover
              usePortrait={dims.portrait}
              mobileScrollSupport
              useMouseEvents
              clickEventForward={false}
              className=""
              style={{}}
              startZIndex={0}
              autoSize
              showPageCorners
              disableFlipByClick={false}
              swipeDistance={30}
              onFlip={(e: { data: number }) => setPage(e.data)}
            >
              {/* Front cover */}
              <Leaf hard className="relative bg-ink text-paper">
                <div className="absolute inset-0">
                  {book.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverUrl} alt="" className="h-full w-full object-cover opacity-60" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
                </div>
                <div className="relative flex h-full flex-col items-center justify-end p-8 text-center">
                  <Ornament />
                  <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-paper">
                    {book.title}
                  </h1>
                  {book.dedication && (
                    <p className="mt-3 max-w-xs text-sm italic text-paper/70">
                      {book.dedication}
                    </p>
                  )}
                </div>
              </Leaf>

              {/* Story spreads */}
              {pages.flatMap((p) => [
                <Leaf key={`img-${p.index}`} className="relative bg-white">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={`Illustration ${p.index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted">No image</div>
                  )}
                </Leaf>,
                <Leaf key={`txt-${p.index}`} className="paper-texture bg-paper">
                  <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center sm:px-10">
                    <Ornament />
                    <p className="mt-6 max-w-md font-display text-lg leading-relaxed text-ink sm:text-xl">
                      {p.text}
                    </p>
                    <span className="mt-auto pt-6 text-xs font-medium text-muted">
                      {p.index + 1}
                    </span>
                  </div>
                </Leaf>,
              ])}

              {/* Back cover */}
              <Leaf hard className="relative bg-ink text-paper">
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <Ornament />
                  <p className="font-display text-2xl font-semibold text-paper">The End</p>
                  <p className="max-w-xs text-sm text-paper/60">
                    Made with love on Fable.
                  </p>
                </div>
              </Leaf>
            </HTMLFlipBook>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-paper/10 bg-ink/80 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {/* narration progress */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-paper/10">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={flipPrev}
              className="grid h-11 w-11 place-items-center rounded-full border border-paper/20 text-paper transition-colors hover:bg-paper/10"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleNarration}
                className="inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-6 font-medium text-white transition-colors hover:bg-accent-hover"
              >
                {narrating ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                {narrating ? "Pause" : "Read aloud"}
              </button>

              <button
                onClick={() => setAutoTurn((a) => !a)}
                className={cn(
                  "inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                  autoTurn
                    ? "border-accent/60 bg-accent/15 text-paper"
                    : "border-paper/20 text-paper/70 hover:bg-paper/10",
                )}
                aria-pressed={autoTurn}
              >
                <VolumeIcon className="h-4 w-4" />
                Auto-turn {autoTurn ? "on" : "off"}
              </button>
            </div>

            <button
              onClick={flipNext}
              className="grid h-11 w-11 place-items-center rounded-full border border-paper/20 text-paper transition-colors hover:bg-paper/10"
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 text-xs text-paper/50">
            <span>
              {storyIndex >= 0
                ? `Page ${storyIndex + 1} of ${pages.length}`
                : page === 0
                  ? "Cover"
                  : "The End"}
            </span>
            <span aria-hidden>·</span>
            <span className="hidden sm:inline">Use arrow keys or swipe to turn</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onTimeUpdate={(e) =>
          setAudioPos({
            t: e.currentTarget.currentTime,
            d: e.currentTarget.duration || 0,
          })
        }
        preload="none"
      />

      <span className="sr-only">{totalLeaves}</span>
      <Link href="/dashboard" className="sr-only">
        Back to library
      </Link>
    </div>
  );
}

type PageFlipApi = {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (n: number) => void;
};
