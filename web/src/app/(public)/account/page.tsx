"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";
import { LoadingState } from "@/components/ui/States";
import {
  displayName,
  initials,
  needsProfileSetup,
  profileSetupUrl,
  syncSessionToLocalStorage,
} from "@/lib/profile";

function AccountInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login/?next=/account/");
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      syncSessionToLocalStorage(session);

      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name, role, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const nextProfile = (data as Profile) || null;
      setProfile(nextProfile);

      if (needsProfileSetup(nextProfile)) {
        router.replace(profileSetupUrl("/account/"));
      }
    }
    void load();
  }, [router]);

  if (!profile && !email) return <LoadingState label="Loading account…" />;

  const name = displayName(profile, email);
  const incomplete = needsProfileSetup(profile);

  return (
    <div className="mx-auto max-w-xl px-5 py-16 md:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-3)]">
        Bloomly
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-tight text-[var(--fg)]">
        Your account
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">
        {profile?.role === "admin"
          ? "You're an admin — you can write posts and manage the site."
          : "You're signed in as a member — you can like posts and leave comments."}
      </p>

      {searchParams.get("error") === "admin_required" ? (
        <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          That area is for admins only. Ask an existing admin to promote your account.
        </p>
      ) : null}

      <div className="bloomly-card mt-8 flex items-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#5BC0BE] text-lg font-bold text-white">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials(name)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-[var(--fg)]">@{name}</p>
          <p className="truncate text-sm text-[var(--fg-muted)]">{email || profile?.email}</p>
        </div>
      </div>

      <div className="bloomly-card mt-4 space-y-3 p-6 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--fg-muted)]">Username</span>
          <span className="font-medium text-[var(--fg)]">{profile?.username || "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--fg-muted)]">Role</span>
          <span className="capitalize text-[var(--fg)]">{profile?.role || "user"}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={profileSetupUrl("/account/")}
          className="rounded-lg bg-gradient-to-r from-[#4F7DF3] to-[#5BC0BE] px-4 py-2 text-sm font-semibold text-white"
        >
          {incomplete ? "Finish profile" : "Edit profile"}
        </Link>
        {profile?.role === "admin" ? (
          <Link
            href="/admin/"
            className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--fg)] hover:bg-slate-50"
          >
            Open admin
          </Link>
        ) : null}
        <Link
          href="/blog/"
          className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--fg)] hover:bg-slate-50"
        >
          Browse blog
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading account…" />}>
      <AccountInner />
    </Suspense>
  );
}
