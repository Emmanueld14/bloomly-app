import { createClient } from "@/lib/supabase/server";
import type { BlogStats, PostWithRelations } from "@/lib/types";

const POST_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  cover_image_url,
  status,
  published,
  category_id,
  author_id,
  created_at,
  updated_at,
  published_at,
  scheduled_at,
  summary,
  url,
  categories ( id, name, slug ),
  post_tags ( tag_id, tags ( id, name, slug ) )
`;

export const POSTS_PER_PAGE = 9;

export async function getPublishedPosts(page = 1) {
  const supabase = await createClient();
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .eq("status", "published")
    .eq("published", true)
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  return {
    posts: (data || []) as unknown as PostWithRelations[],
    count: count || 0,
    error: error?.message || null,
  };
}

export async function getPublishedPostBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("published", true)
    .maybeSingle();

  return {
    post: (data || null) as PostWithRelations | null,
    error: error?.message || null,
  };
}

export async function getPostsByCategorySlug(slug: string, page = 1) {
  const supabase = await createClient();
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (categoryError || !category) {
    return { category: null, posts: [], count: 0, error: categoryError?.message || "Category not found" };
  }

  const { data, error, count } = await supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .eq("category_id", category.id)
    .eq("status", "published")
    .eq("published", true)
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  return {
    category,
    posts: (data || []) as unknown as PostWithRelations[],
    count: count || 0,
    error: error?.message || null,
  };
}

export async function getPostsByTagSlug(slug: string, page = 1) {
  const supabase = await createClient();
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (tagError || !tag) {
    return { tag: null, posts: [], count: 0, error: tagError?.message || "Tag not found" };
  }

  const { data: links, error: linkError } = await supabase
    .from("post_tags")
    .select("post_id")
    .eq("tag_id", tag.id);

  if (linkError) {
    return { tag, posts: [], count: 0, error: linkError.message };
  }

  const postIds = (links || []).map((l) => l.post_id);
  if (postIds.length === 0) {
    return { tag, posts: [], count: 0, error: null };
  }

  const { data, error, count } = await supabase
    .from("posts")
    .select(POST_SELECT, { count: "exact" })
    .in("id", postIds)
    .eq("status", "published")
    .eq("published", true)
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  return {
    tag,
    posts: (data || []) as unknown as PostWithRelations[],
    count: count || 0,
    error: error?.message || null,
  };
}

export async function getAdminPosts(filters: {
  search?: string;
  status?: string;
  categoryId?: string;
  sort?: "date_desc" | "date_asc" | "title_asc";
}) {
  const supabase = await createClient();
  let query = supabase.from("posts").select(POST_SELECT);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
  }

  switch (filters.sort) {
    case "date_asc":
      query = query.order("created_at", { ascending: true });
      break;
    case "title_asc":
      query = query.order("title", { ascending: true });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;
  return {
    posts: (data || []) as unknown as PostWithRelations[],
    error: error?.message || null,
  };
}

export async function getAdminPost(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();

  return {
    post: (data || null) as PostWithRelations | null,
    error: error?.message || null,
  };
}

export async function getBlogStats(): Promise<{ stats: BlogStats; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select("status");

  if (error) {
    return {
      stats: { total: 0, drafts: 0, published: 0, scheduled: 0 },
      error: error.message,
    };
  }

  const rows = data || [];
  const stats: BlogStats = {
    total: rows.length,
    drafts: rows.filter((r) => (r.status || "draft") === "draft").length,
    published: rows.filter((r) => r.status === "published").length,
    scheduled: rows.filter((r) => r.status === "scheduled").length,
  };

  return { stats, error: null };
}

export async function getCategoriesAndTags() {
  const supabase = await createClient();
  const [categoriesRes, tagsRes] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("tags").select("*").order("name"),
  ]);

  return {
    categories: categoriesRes.data || [],
    tags: tagsRes.data || [],
    error: categoriesRes.error?.message || tagsRes.error?.message || null,
  };
}

export async function isSlugTaken(slug: string, excludeId?: number) {
  const supabase = await createClient();
  let query = supabase.from("posts").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error && error.code !== "PGRST116") {
    return { taken: false, error: error.message };
  }
  return { taken: Boolean(data), error: null };
}
