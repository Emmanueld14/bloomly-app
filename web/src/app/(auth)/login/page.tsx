"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { LoadingState } from "@/components/ui/States";

function LoginInner() {
  const params = useSearchParams();
  const nextPath = params.get("next")?.startsWith("/") ? params.get("next")! : undefined;
  const error = params.get("error");

  return (
    <div className="w-full max-w-md">
      {error === "missing_supabase_env" ? (
        <div className="mx-auto mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-sm backdrop-blur-sm">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">
            Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      ) : null}
      {error === "account_deactivated" ? (
        <div className="mx-auto mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 shadow-sm backdrop-blur-sm">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p className="text-sm text-red-700">
            This account has been deactivated. Contact an admin if you think this is a mistake.
          </p>
        </div>
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
