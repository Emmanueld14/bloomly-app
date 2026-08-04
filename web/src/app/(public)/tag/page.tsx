import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getCategoriesAndTags } from "@/lib/posts";

export const metadata = { title: "Tags" };

export default async function TagsIndexPage() {
  const { tags, error } = await getCategoriesAndTags();

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight md:text-5xl">
        Tags
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">Follow threads across essays.</p>

      <div className="mt-10">
        {error ? (
          <ErrorState message={error} />
        ) : tags.length === 0 ? (
          <EmptyState title="No tags yet" />
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="border border-white/15 px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
