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
      try {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
        setPosts([]);
      }
    }
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pt-16">
      <section className="mb-16 max-w-3xl">
        <p className="fade-up text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
          Bloomly essays
        </p>
        <h1 className="fade-up-delay mt-4 font-[family-name:var(--font-manrope)] text-5xl font-extrabold leading-[0.95] tracking-tight text-[var(--fg)] md:text-7xl">
          Stories that help you feel less alone
        </h1>
        <p className="fade-up-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-[var(--fg-muted)]">
          Honest reflections for teens — calm support, one gentle page at a time.
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
        <Link href="/blog/" className="font-semibold text-[var(--accent-2)] hover:underline">
          Open the Bloomly blog
        </Link>
        <span aria-hidden>·</span>
        <Link href="/category/" className="hover:text-[var(--accent-2)]">
          Categories
        </Link>
        <span aria-hidden>·</span>
        <Link href="/tag/" className="hover:text-[var(--accent-2)]">
          Tags
        </Link>
      </div>
    </div>
  );
}
