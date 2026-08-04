"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";
import { displayName, initials, needsProfileSetup, profileSetupUrl } from "@/lib/profile";

export function SiteHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email || null);
        const { data } = await supabase
          .from("profiles")
          .select("id, email, display_name, role, username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (data) setProfile(data as Profile);
      } catch {
        // ignore header auth errors on public pages
      }
    }
    void load();
  }, []);

  const name = displayName(profile, email);
  const incomplete = needsProfileSetup(profile);

  return (
    <header className="relative z-20 border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight md:text-3xl">
            Aether<span className="gradient-text">Press</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[var(--fg-muted)] md:gap-6">
          <Link href="/" className="transition hover:text-white">
            Essays
          </Link>
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin/" className="transition hover:text-white">
                  Admin
                </Link>
              ) : null}
              {incomplete ? (
                <Link
                  href={profileSetupUrl("/account/")}
                  className="font-semibold text-teal-300 transition hover:text-teal-200"
                >
                  Finish profile
                </Link>
              ) : null}
              <Link
                href="/account/"
                className="inline-flex items-center gap-2 transition hover:text-white"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-400 to-sky-500 text-[0.65rem] font-bold text-white">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(name)
                  )}
                </span>
                <span className="hidden sm:inline">{name}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login/" className="transition hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup/"
                className="rounded-md bg-white/10 px-3 py-1.5 text-white transition hover:bg-white/15"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
