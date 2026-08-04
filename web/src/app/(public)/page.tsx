"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/public/PostCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { PostWithRelations } from "@/lib/types";

const POST_SELECT = `
  id, title, slug, excerpt, content, featured_image_url, cover_image_url, status, published,
  category_id, author_id, created_at, updated_at, published_at, scheduled_at, summary, url,
  categories ( id, name, slug ),
  post_tags ( tag_id, tags ( id, name, slug ) )
`;

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithRelations[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setPosts([]);
        return;
      }
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("status", "published")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(9);
      if (fetchError) {
        setError(fetchError.message);
        setPosts([]);
        return;
      }
      setPosts((data || []) as unknown as PostWithRelations[]);
    }
    void load();
  }, []);

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

      {posts === null ? (
        <LoadingState label="Loading essays…" />
      ) : error ? (
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
        </div>
      )}

      <div className="mt-16 flex flex-wrap gap-4 text-sm text-[var(--fg-muted)]">
        <Link href="/category/" className="hover:text-white">
          Browse categories
        </Link>
        <span aria-hidden>·</span>
        <Link href="/tag/" className="hover:text-white">
          Browse tags
        </Link>
      </div>
    </div>
  );
}
