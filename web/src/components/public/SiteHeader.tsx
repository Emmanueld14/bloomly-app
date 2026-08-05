"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
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
    <header className="relative z-20 border-b border-[var(--border)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <BrandLogo />
        <nav className="flex items-center gap-4 text-sm text-[var(--fg-muted)] md:gap-6">
          <Link href="/blog/" className="transition hover:text-[var(--accent-2)]">
            Blog
          </Link>
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin/" className="transition hover:text-[var(--accent-2)]">
                  Admin
                </Link>
              ) : null}
              {incomplete ? (
                <Link
                  href={profileSetupUrl("/account/")}
                  className="font-semibold text-[var(--accent-3)] transition hover:text-teal-700"
                >
                  Finish profile
                </Link>
              ) : null}
              <Link
                href="/account/"
                className="inline-flex items-center gap-2 font-medium text-[var(--fg)] transition hover:text-[var(--accent-2)]"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#5BC0BE] text-[0.65rem] font-bold text-white">
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
              <Link href="/login/" className="transition hover:text-[var(--accent-2)]">
                Log in
              </Link>
              <Link
                href="/signup/"
                className="rounded-full bg-gradient-to-r from-[#4F7DF3] to-[#5BC0BE] px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:brightness-105"
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
