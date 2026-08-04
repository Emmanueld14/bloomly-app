"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLocalSession } from "@/lib/profile";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalSession();
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className={
        className ||
        "rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
      }
    >
      Sign out
    </button>
  );
}
