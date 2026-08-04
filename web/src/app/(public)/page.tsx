import Link from "next/link";
import { PostCard } from "@/components/public/PostCard";
import { Pagination } from "@/components/public/Pagination";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <ErrorState message="Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to load posts." />
      </div>
    );
  }

  const { posts, count, error } = await getPublishedPosts(page);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pt-16">
      <section className="mb-16 max-w-3xl">
        <p className="fade-up text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          Editorial dispatch
        </p>
        <h1 className="fade-up-delay mt-4 font-[family-name:var(--font-syne)] text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
          Aether<span className="gradient-text">Press</span>
        </h1>
        <p className="fade-up-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-[var(--fg-muted)]">
          Long-form notes on culture, systems, and the futures we build — published when ready,
          never rushed.
        </p>
      </section>

      {error ? (
        <ErrorState message={`Unable to load posts. ${error}`} />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No published essays yet"
          description="When the first piece goes live, it will appear here."
        />
      ) : (
        <div className="space-y-12">
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
          <Pagination page={page} total={count} basePath="/" />
        </div>
      )}

      <div className="mt-16 flex flex-wrap gap-4 text-sm text-[var(--fg-muted)]">
        <Link href="/category" className="hover:text-white">
          Browse categories
        </Link>
        <span aria-hidden>·</span>
        <Link href="/tag" className="hover:text-white">
          Browse tags
        </Link>
      </div>
    </div>
  );
}
