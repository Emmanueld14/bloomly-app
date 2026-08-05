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
    <div className="bloomly-card mx-auto w-full max-w-md p-8">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-3)]">
        Bloomly
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--fg)]">
        {mode === "login" ? "Welcome back" : "Join Bloomly"}
      </h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        {mode === "login"
          ? "Log in to like posts and leave comments. Admins open the writing desk."
          : "Create a free account to like posts and join the conversation."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block space-y-1.5 text-sm font-medium text-[var(--fg)]">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-[var(--fg)]">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-[#4F7DF3] to-[#5BC0BE] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
        >
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--fg-muted)]">
        {mode === "login" ? (
          <>
            Need an account?{" "}
            <Link href="/signup" className="font-semibold text-[var(--accent-2)] hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-[var(--accent-2)] hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
