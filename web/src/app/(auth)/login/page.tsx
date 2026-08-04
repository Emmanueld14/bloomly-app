import { AuthForm } from "@/components/auth/AuthForm";

type SearchParams = Promise<{ next?: string; error?: string }>;

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : undefined;

  return (
    <div className="w-full">
      {params.error === "missing_supabase_env" ? (
        <p className="mx-auto mb-4 max-w-md rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      ) : null}
      <AuthForm mode="login" nextPath={nextPath} />
    </div>
  );
}
