import { notFound } from "next/navigation";
import { PostCard } from "@/components/public/PostCard";
import { Pagination } from "@/components/public/Pagination";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getPostsByTagSlug } from "@/lib/posts";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const { tag } = await getPostsByTagSlug(slug, 1);
  return { title: tag ? `#${tag.name}` : "Tag" };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || "1") || 1);
  const { tag, posts, count, error } = await getPostsByTagSlug(slug, page);

  if (!tag && !error) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">Tag</p>
      <h1 className="mt-3 font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight md:text-5xl">
        #{tag?.name || slug}
      </h1>

      <div className="mt-12 space-y-12">
        {error ? (
          <ErrorState message={error} />
        ) : posts.length === 0 ? (
          <EmptyState title="No essays with this tag" />
        ) : (
          <>
            {posts.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))}
            <Pagination page={page} total={count} basePath={`/tag/${slug}`} />
          </>
        )}
      </div>
    </div>
  );
}
