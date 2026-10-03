"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";
import { displayName, initials, needsProfileSetup, profileSetupUrl } from "@/lib/profile";

export function SiteHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        setProfile(null);
        setEmail(null);
        setIsLoading(false);
        return;
      }
      
      setEmail(user.email || null);
      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name, role, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    } catch {
      setProfile(null);
      setEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    
    void loadUserProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        void loadUserProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const name = displayName(profile, email);
  const incomplete = needsProfileSetup(profile);

  return (
    <header className="relative z-20 border-b border-[var(--border-subtle)] bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8 md:py-4">
        <BrandLogo imgClassName="h-9 w-auto max-w-[150px] object-contain md:h-10" />
        <nav className="flex items-center gap-3 text-sm text-[var(--fg-muted)] md:gap-5">
          <Link
            href="/blog/"
            className="rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-2)]"
          >
            Blog
          </Link>
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link
                  href="/admin/"
                  className="rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-2)]"
                >
                  Admin
                </Link>
              ) : null}
              {incomplete ? (
                <Link
                  href={profileSetupUrl("/account/")}
                  className="rounded-md px-2 py-1.5 font-semibold text-[var(--accent-3)] transition-colors hover:bg-[var(--accent-soft)]"
                >
                  Finish profile
                </Link>
              ) : null}
              <Link
                href="/account/"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--accent-soft)]/50 py-1.5 pl-1.5 pr-3 font-medium text-[var(--fg)] transition-all hover:bg-[var(--accent-soft)]"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#5BC0BE] text-[0.65rem] font-bold text-white shadow-sm ring-2 ring-white">
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
                <span className="hidden text-sm sm:inline">{name}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login/"
                className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent-2)]"
              >
                Log in
              </Link>
              <Link
                href="/signup/"
                className="rounded-full bg-gradient-to-r from-[#4F7DF3] to-[#5BC0BE] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105"
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
