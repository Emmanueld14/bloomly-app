"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Markdown } from "@/components/public/Markdown";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { PostWithRelations, Tag } from "@/lib/types";
import { formatDate, getFeaturedImage, readingTimeMinutes } from "@/lib/utils";

const POST_SELECT = `
  id, title, slug, excerpt, content, featured_image_url, cover_image_url, status, published,
  category_id, author_id, created_at, updated_at, published_at, scheduled_at, summary, url,
  categories ( id, name, slug ),
  post_tags ( tag_id, tags ( id, name, slug ) )
`;

export function PostPageClient() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [post, setPost] = useState<PostWithRelations | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("slug", slug)
        .eq("status", "published")
        .eq("published", true)
        .maybeSingle();
      if (fetchError) {
        setError(fetchError.message);
        setPost(null);
        return;
      }
      setPost((data || null) as PostWithRelations | null);
    }
    void load();
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <ErrorState message={error} />
      </div>
    );
  }
  if (post === undefined) return <LoadingState label="Loading essay…" />;
  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <ErrorState message="Essay not found." />
      </div>
    );
  }

  const image = getFeaturedImage(post);
  const tags = (post.post_tags || [])
    .map((pt) => pt.tags)
    .filter((t): t is Tag => Boolean(t));

  return (
    <article>
      <div className="relative min-h-[52vh] w-full overflow-hidden">
        {image ? (
          <Image src={image} alt="" fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/25 via-sky-500/15 to-amber-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/75 to-slate-900/35" />
        <div className="relative z-10 mx-auto flex min-h-[52vh] max-w-3xl flex-col justify-end px-5 pb-12 pt-24 md:px-8">
          <div className="fade-up flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/80">
            {post.categories ? (
              <Link href={`/category/${post.categories.slug}/`} className="text-teal-200">
                {post.categories.name}
              </Link>
            ) : null}
            <time dateTime={post.published_at || post.created_at}>
              {formatDate(post.published_at || post.created_at)}
            </time>
            <span>{readingTimeMinutes(post.content)} min read</span>
          </div>
          <h1 className="fade-up-delay mt-4 font-[family-name:var(--font-manrope)] text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="fade-up-delay-2 mt-5 max-w-2xl text-lg text-white/85">{post.excerpt}</p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        {post.content ? (
          <Markdown content={post.content} />
        ) : (
          <p className="text-[var(--fg-muted)]">This essay has no content yet.</p>
        )}

        {tags.length > 0 ? (
          <div className="mt-14 flex flex-wrap gap-2 border-t border-[var(--border)] pt-8">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}/`}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-10">
          <Link href="/blog/" className="text-sm font-semibold text-[var(--accent-2)] hover:underline">
            ← Back to blog
          </Link>
        </div>
      </div>
    </article>
  );
}
