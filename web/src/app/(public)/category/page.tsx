import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getCategoriesAndTags } from "@/lib/posts";

export const metadata = { title: "Categories" };

export default async function CategoriesIndexPage() {
  const { categories, error } = await getCategoriesAndTags();

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
      <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight md:text-5xl">
        Categories
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">Browse essays by theme.</p>

      <div className="mt-10">
        {error ? (
          <ErrorState message={error} />
        ) : categories.length === 0 ? (
          <EmptyState title="No categories yet" />
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/category/${category.slug}`}
                  className="flex items-center justify-between py-5 transition hover:text-[var(--accent)]"
                >
                  <span className="font-[family-name:var(--font-syne)] text-xl font-semibold">
                    {category.name}
                  </span>
                  <span className="text-sm text-[var(--fg-muted)]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
