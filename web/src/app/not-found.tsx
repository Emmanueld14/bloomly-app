import Link from "next/link";

export default function NotFound() {
  return (
    <div className="site-gradient flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-[family-name:var(--font-syne)] text-5xl font-bold">404</h1>
      <p className="mt-3 text-[var(--fg-muted)]">That page drifted out of orbit.</p>
      <Link href="/" className="mt-8 text-sm text-[var(--accent)] hover:underline">
        Back home
      </Link>
    </div>
  );
}
