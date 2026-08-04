import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

type SearchParams = Promise<{ error?: string }>;

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { user, profile } = await getProfile();

  return (
    <div className="mx-auto max-w-xl px-5 py-16 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight">
        Your account
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">
        Signed in as a {profile?.role === "admin" ? "admin" : "reader"}.
      </p>

      {params.error === "admin_required" ? (
        <p className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          That area is for admins only. Ask an existing admin to promote your account.
        </p>
      ) : null}

      <div className="mt-8 space-y-3 rounded-xl border border-white/10 bg-black/30 p-6 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--fg-muted)]">Email</span>
          <span>{user?.email || profile?.email || "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--fg-muted)]">Display name</span>
          <span>{profile?.display_name || "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--fg-muted)]">Role</span>
          <span className="capitalize">{profile?.role || "user"}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {profile?.role === "admin" ? (
          <Link
            href="/admin"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Open admin
          </Link>
        ) : null}
        <Link
          href="/"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
        >
          Browse essays
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
