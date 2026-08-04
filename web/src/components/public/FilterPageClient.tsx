"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export function FilterPageClient({ kind }: { kind: "category" | "tag" }) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [title, setTitle] = useState(slug || "");
  const [posts, setPosts] = useState<PostWithRelations[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const supabase = createClient();
      if (kind === "category") {
        const { data: category, error: catError } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("slug", slug)
          .maybeSingle();
        if (catError || !category) {
          setError(catError?.message || "Category not found");
          setPosts([]);
          return;
        }
        setTitle(category.name);
        const { data, error: postsError } = await supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("category_id", category.id)
          .eq("status", "published")
          .eq("published", true)
          .order("published_at", { ascending: false, nullsFirst: false });
        if (postsError) {
          setError(postsError.message);
          setPosts([]);
          return;
        }
        setPosts((data || []) as unknown as PostWithRelations[]);
        return;
      }

      const { data: tag, error: tagError } = await supabase
        .from("tags")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (tagError || !tag) {
        setError(tagError?.message || "Tag not found");
        setPosts([]);
        return;
      }
      setTitle(tag.name);
      const { data: links, error: linkError } = await supabase
        .from("post_tags")
        .select("post_id")
        .eq("tag_id", tag.id);
      if (linkError) {
        setError(linkError.message);
        setPosts([]);
        return;
      }
      const ids = (links || []).map((l) => l.post_id);
      if (ids.length === 0) {
        setPosts([]);
        return;
      }
      const { data, error: postsError } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .in("id", ids)
        .eq("status", "published")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false });
      if (postsError) {
        setError(postsError.message);
        setPosts([]);
        return;
      }
      setPosts((data || []) as unknown as PostWithRelations[]);
    }
    void load();
  }, [kind, slug]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
        {kind === "category" ? "Category" : "Tag"}
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight md:text-5xl">
        {kind === "tag" ? `#${title}` : title}
      </h1>
      <div className="mt-12 space-y-12">
        {posts === null ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : posts.length === 0 ? (
          <EmptyState title="No essays found" />
        ) : (
          posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
        )}
      </div>
    </div>
  );
}
