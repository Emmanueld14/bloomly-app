import Image from "next/image";
import Link from "next/link";
import type { PostWithRelations } from "@/lib/types";
import { formatDate, getFeaturedImage } from "@/lib/utils";

export function PostCard({ post, index = 0 }: { post: PostWithRelations; index?: number }) {
  const image = getFeaturedImage(post);
  const category = post.categories;
  const date = formatDate(post.published_at || post.created_at);

  return (
    <article
      className="group fade-up border-b border-[var(--border)] pb-10 last:border-0"
      style={{ animationDelay: `${Math.min(index, 6) * 0.06}s` }}
    >
      <Link href={`/posts/${post.slug}`} className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-200/70 via-teal-100 to-blue-100" />
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            {category ? (
              <span className="font-semibold text-[var(--accent-3)]">{category.name}</span>
            ) : null}
            {date ? <time dateTime={post.published_at || post.created_at}>{date}</time> : null}
          </div>
          <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold leading-tight tracking-tight text-[var(--fg)] transition group-hover:text-[var(--accent-2)] md:text-3xl">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="max-w-xl leading-relaxed text-[var(--fg-muted)]">{post.excerpt}</p>
          ) : null}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-2)]">
            Read essay
            <span className="transition group-hover:translate-x-1">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
