"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Field, Input } from "./ui";
import { Logo } from "./brand";

function AuthFormInner({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isRegister = mode === "register";

  useEffect(() => {
    setName(searchParams.get("name") ?? "");
    setEmail(searchParams.get("email") ?? "");
    setPassword(searchParams.get("password") ?? "");

    if (searchParams.has("email") || searchParams.has("password")) {
      const path = isRegister ? "/register" : "/login";
      router.replace(path);
    }
  }, [searchParams, router, isRegister]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body = isRegister
      ? { name: name.trim(), email: email.trim(), password }
      : { email: email.trim(), password };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {isRegister
            ? "Start turning the people you love into stories."
            : "Sign in to continue to your library."}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-line bg-card p-7 shadow-[0_24px_60px_-40px_rgba(80,70,228,0.25)]"
      >
        {isRegister && (
          <Field label="Your name">
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              required
            />
          </Field>
        )}
        <Field label="Email">
          <Input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" hint={isRegister ? "At least 8 characters" : undefined}>
          <Input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
        </Field>

        {error && (
          <p className="rounded-lg border border-accent/30 bg-accent-soft/50 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {isRegister ? "Create account" : "Sign in"}
        </Button>

        {!isRegister && (
          <button
            type="button"
            onClick={() => {
              setEmail("test_1783667796052@example.com");
              setPassword("password123");
            }}
            className="w-full rounded-xl border border-dashed border-line py-2 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink-soft"
          >
            🛠 Dev login
          </button>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {isRegister ? "Already have an account? " : "New to Fable? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-accent hover:text-accent-hover"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  return (
    <Suspense>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
