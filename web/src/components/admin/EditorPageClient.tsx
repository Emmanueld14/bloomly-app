"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { Category, PostWithRelations, Tag } from "@/lib/types";

const POST_SELECT = `
  id, title, slug, excerpt, content, featured_image_url, cover_image_url, status, published,
  category_id, author_id, created_at, updated_at, published_at, scheduled_at, summary, url,
  categories ( id, name, slug ),
  post_tags ( tag_id, tags ( id, name, slug ) )
`;

export function EditorPageClient({ mode }: { mode: "new" | "edit" }) {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [post, setPost] = useState<PostWithRelations | null | undefined>(
    mode === "new" ? null : undefined
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [categoriesRes, tagsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("tags").select("*").order("name"),
      ]);
      if (categoriesRes.error || tagsRes.error) {
        setError(categoriesRes.error?.message || tagsRes.error?.message || "Failed to load");
        return;
      }
      setCategories((categoriesRes.data || []) as Category[]);
      setTags((tagsRes.data || []) as Tag[]);

      if (mode === "edit") {
        const id = Number(idParam);
        if (!Number.isFinite(id)) {
          setError("Missing post id.");
          setPost(null);
          return;
        }
        const { data, error: postError } = await supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("id", id)
          .maybeSingle();
        if (postError) {
          setError(postError.message);
          setPost(null);
          return;
        }
        setPost((data || null) as PostWithRelations | null);
      }
    }
    void load();
  }, [mode, idParam]);

  if (error) return <AdminErrorState message={error} />;
  if (post === undefined) return <AdminLoadingState />;
  if (mode === "edit" && !post) return <AdminErrorState message="Post not found." />;

  return (
    <PostEditor
      post={post}
      categories={categories}
      tags={tags}
    />
  );
}
