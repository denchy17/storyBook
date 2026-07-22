import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-[0_8px_20px_-8px_rgba(191,90,52,0.8)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 6.2C10.4 4.8 8 4.3 5 4.9v13.4c3-.6 5.4-.1 7 1.3 1.6-1.4 4-1.9 7-1.3V4.9c-3-.6-5.4-.1-7 1.3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12 6.2v13.4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Fable
      </span>
    </span>
  );
}

export function LogoLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="transition-opacity hover:opacity-80">
      <Logo />
    </Link>
  );
}
