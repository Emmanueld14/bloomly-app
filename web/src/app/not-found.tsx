import Link from "next/link";

export default function NotFound() {
  return (
    <div className="site-gradient flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-[family-name:var(--font-manrope)] text-5xl font-extrabold text-[var(--fg)]">
        404
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">That page isn’t here — let’s get you somewhere calmer.</p>
      <Link
        href="/"
        className="mt-8 text-sm font-semibold text-[var(--accent-2)] hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
