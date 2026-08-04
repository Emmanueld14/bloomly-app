import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-[var(--border)] bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-[var(--fg-muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          <span className="font-[family-name:var(--font-manrope)] font-bold text-[var(--fg)]">
            Bloomly
          </span>
          {" — "}a quieter place to feel understood.
        </p>
        <div className="flex gap-5">
          <Link href="/" className="hover:text-[var(--accent-2)]">
            Home
          </Link>
          <Link href="/blog/" className="hover:text-[var(--accent-2)]">
            Blog
          </Link>
          <Link href="/login/" className="hover:text-[var(--accent-2)]">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}
