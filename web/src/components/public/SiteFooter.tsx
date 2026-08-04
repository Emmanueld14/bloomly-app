import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-[var(--fg-muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          <span className="font-[family-name:var(--font-syne)] font-semibold text-white">AetherPress</span>
          {" — "}signals from the edge of ideas.
        </p>
        <div className="flex gap-5">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <Link href="/login" className="hover:text-white">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-white">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
