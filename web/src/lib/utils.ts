export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatDate(value: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

export function readingTimeMinutes(content: string | null | undefined): number {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getFeaturedImage(post: {
  featured_image_url?: string | null;
  cover_image_url?: string | null;
}) {
  return post.featured_image_url || post.cover_image_url || null;
}

export function isPublishedVisible(post: {
  status?: string | null;
  published?: boolean | null;
  published_at?: string | null;
}) {
  const status = post.status || "draft";
  if (status !== "published") return false;
  if (post.published === false) return false;
  if (post.published_at && new Date(post.published_at) > new Date()) return false;
  return true;
}
