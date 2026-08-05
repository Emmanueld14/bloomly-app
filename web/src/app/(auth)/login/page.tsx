"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { LoadingState } from "@/components/ui/States";

function LoginInner() {
  const params = useSearchParams();
  const nextPath = params.get("next")?.startsWith("/") ? params.get("next")! : undefined;

  return (
    <div className="w-full">
      {params.get("error") === "missing_supabase_env" ? (
        <p className="mx-auto mb-4 max-w-md rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      ) : null}
      {params.get("error") === "account_deactivated" ? (
        <p className="mx-auto mb-4 max-w-md rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          This account has been deactivated. Contact an admin if you think this is a mistake.
        </p>
      ) : null}
      <AuthForm mode="login" nextPath={nextPath} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <LoginInner />
    </Suspense>
  );
}
