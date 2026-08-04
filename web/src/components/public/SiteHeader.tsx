import Link from "next/link";
import { getProfile } from "@/lib/auth";

export async function SiteHeader() {
  let profile: Awaited<ReturnType<typeof getProfile>>["profile"] = null;
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ({ profile } = await getProfile());
    }
  } catch {
    profile = null;
  }

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
                <Link href="/admin" className="transition hover:text-white">
                  Admin
                </Link>
              ) : null}
              <Link href="/account" className="transition hover:text-white">
                Account
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
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
