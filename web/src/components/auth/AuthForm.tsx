"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { needsProfileSetup, profileSetupUrl, syncSessionToLocalStorage } from "@/lib/profile";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: Mode;
  nextPath?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resolveDestination() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "/";

    const {
      data: { session },
    } = await supabase.auth.getSession();
    syncSessionToLocalStorage(session);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      throw new Error("This account has been deactivated. Contact an admin.");
    }

    const preferred =
      profile?.role === "admin"
        ? nextPath?.startsWith("/") && !nextPath.startsWith("/login")
          ? nextPath
          : "/admin/"
        : nextPath?.startsWith("/") && !nextPath.startsWith("/admin")
          ? nextPath
          : "/blog/";

    if (needsProfileSetup(profile)) {
      return profileSetupUrl(preferred);
    }
    return preferred;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.replace(await resolveDestination());
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: email.split("@")[0] },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          syncSessionToLocalStorage(data.session);
          router.replace(await resolveDestination());
          router.refresh();
        } else {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-md fade-up">
      {/* Decorative orbs */}
      <div className="floating-orb floating-orb-1" />
      <div className="floating-orb floating-orb-2" />

      <div className="bloomly-card-elevated relative mx-auto p-8 md:p-10">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-3)]">
            Bloomly
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--fg)] md:text-4xl">
            {mode === "login" ? "Welcome back" : "Join Bloomly"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)] md:text-base">
            {mode === "login"
              ? "Log in to like posts and leave comments. Admins open the writing desk."
              : "Create a free account to like posts and join the conversation."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[var(--fg)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--fg)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "login" ? "Enter your password" : "Create a password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 backdrop-blur-sm">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          {message ? (
            <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 backdrop-blur-sm">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-teal-800">{message}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="auth-btn mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Please wait…
              </span>
            ) : mode === "login" ? (
              "Log in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[var(--fg-muted)]">or</span>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--fg-muted)]">
          {mode === "login" ? (
            <>
              New to Bloomly?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[var(--accent-2)] transition-colors hover:text-[var(--accent-3)] hover:underline"
              >
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--accent-2)] transition-colors hover:text-[var(--accent-3)] hover:underline"
              >
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
