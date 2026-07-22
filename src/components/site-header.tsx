"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoLink } from "./brand";
import { Button, LinkButton } from "./ui";
import { LogoutIcon, UserIcon } from "./icons";

export function SiteHeader({
  user,
}: {
  user: { name: string } | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <LogoLink href={user ? "/dashboard" : "/"} />
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
            >
              My library
            </Link>
            <span className="hidden items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink-soft sm:flex">
              <UserIcon className="h-4 w-4 text-accent" />
              {user.name}
            </span>
            <Button variant="ghost" size="sm" onClick={logout} loading={loading}>
              <LogoutIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Sign in
            </Link>
            <LinkButton href="/register" size="sm">
              Get started
            </LinkButton>
          </div>
        )}
      </div>
    </header>
  );
}
