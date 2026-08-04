import Link from "next/link";
import { POSTS_PER_PAGE } from "@/lib/posts";

export function Pagination({
  page,
  total,
  basePath,
}: {
  page: number;
  total: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    if (p <= 1) return basePath;
    const joiner = basePath.includes("?") ? "&" : "?";
    return `${basePath}${joiner}page=${p}`;
  };

  return (
    <nav className="mt-12 flex items-center justify-between border-t border-[var(--border)] pt-6 text-sm">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="text-[var(--fg-muted)] hover:text-[var(--accent-2)]">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[var(--fg-muted)]">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="text-[var(--fg-muted)] hover:text-[var(--accent-2)]">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
