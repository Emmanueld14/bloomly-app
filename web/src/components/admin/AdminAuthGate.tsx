"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace(`/login/?next=${encodeURIComponent("/admin/")}`);
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, display_name, role, username, avatar_url, is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        let nextProfile = data as Profile | null;
        if (!nextProfile) {
          const { data: created, error: insertError } = await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: user.email,
              display_name: user.email?.split("@")[0] || "User",
              username: "user_" + String(user.id).replace(/-/g, "").slice(0, 8),
              role: "user",
            })
            .select("id, email, display_name, role, username, avatar_url, is_active")
            .single();
          if (insertError) throw insertError;
          nextProfile = created as Profile;
        }

        if (nextProfile.is_active === false) {
          await supabase.auth.signOut();
          router.replace("/login/?error=account_deactivated");
          return;
        }

        if (nextProfile.role !== "admin") {
          router.replace("/account/?error=admin_required");
          return;
        }

        if (!cancelled) {
          setProfile(nextProfile);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Auth check failed");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>{error}</p>
          <Link href="/login/" className="mt-4 inline-block text-teal-700 underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!ready || !profile) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center text-sm text-gray-500">
        Checking admin access…
      </div>
    );
  }

  return <>{children}</>;
}
