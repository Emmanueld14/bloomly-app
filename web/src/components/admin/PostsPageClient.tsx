"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostsTable } from "@/components/admin/PostsTable";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { Category, PostWithRelations } from "@/lib/types";

const POST_SELECT = `
  id, title, slug, excerpt, content, featured_image_url, cover_image_url, status, published,
  category_id, author_id, created_at, updated_at, published_at, scheduled_at, summary, url,
  categories ( id, name, slug ),
  post_tags ( tag_id, tags ( id, name, slug ) )
`;

export function PostsPageClient() {
  const [posts, setPosts] = useState<PostWithRelations[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [postsRes, categoriesRes] = await Promise.all([
        supabase.from("posts").select(POST_SELECT).order("updated_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
      ]);
      if (postsRes.error || categoriesRes.error) {
        setError(postsRes.error?.message || categoriesRes.error?.message || "Failed to load");
        return;
      }
      setPosts((postsRes.data || []) as unknown as PostWithRelations[]);
      setCategories((categoriesRes.data || []) as Category[]);
    }
    void load();
  }, []);

  if (error) return <AdminErrorState message={error} />;
  if (!posts) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Posts</h1>
          <p className="mt-1 text-sm text-gray-500">Sort, filter, and manage every essay.</p>
        </div>
        <Link href="/admin/posts/new/" className="admin-btn admin-btn-primary">
          + New Post
        </Link>
      </div>
      <PostsTable posts={posts} categories={categories} />
    </div>
  );
}
