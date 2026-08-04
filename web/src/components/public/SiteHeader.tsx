import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight md:text-3xl">
            Aether<span className="gradient-text">Press</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-[var(--fg-muted)]">
          <Link href="/" className="transition hover:text-white">
            Essays
          </Link>
          <Link href="/login" className="transition hover:text-white">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
