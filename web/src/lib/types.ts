export type PostStatus = "draft" | "published" | "scheduled";

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
};

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_url: string | null;
  cover_image_url?: string | null;
  status: PostStatus | string | null;
  published: boolean | null;
  category_id: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  scheduled_at?: string | null;
  summary?: string | null;
  url?: string | null;
  category?: string | null;
  categories?: Category | null;
  post_tags?: { tag_id: string; tags: Tag | null }[] | null;
};

export type PostWithRelations = Post & {
  categories: Category | null;
  post_tags: { tag_id: string; tags: Tag | null }[] | null;
};

export type BlogStats = {
  total: number;
  drafts: number;
  published: number;
  scheduled: number;
};
