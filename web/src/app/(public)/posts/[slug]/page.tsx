import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/public/Markdown";
import { ErrorState } from "@/components/ui/States";
import { getPublishedPostBySlug } from "@/lib/posts";
import { formatDate, getFeaturedImage, readingTimeMinutes } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const { post } = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { post, error } = await getPublishedPostBySlug(slug);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!post) notFound();

  const image = getFeaturedImage(post);
  const tags = (post.post_tags || [])
    .map((pt) => pt.tags)
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <article>
      <div className="relative min-h-[52vh] w-full overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/25 via-sky-500/15 to-amber-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-black/30" />
        <div className="relative z-10 mx-auto flex min-h-[52vh] max-w-3xl flex-col justify-end px-5 pb-12 pt-24 md:px-8">
          <div className="fade-up flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/70">
            {post.categories ? (
              <Link href={`/category/${post.categories.slug}`} className="text-[var(--accent)]">
                {post.categories.name}
              </Link>
            ) : null}
            <time dateTime={post.published_at || post.created_at}>
              {formatDate(post.published_at || post.created_at)}
            </time>
            <span>{readingTimeMinutes(post.content)} min read</span>
          </div>
          <h1 className="fade-up-delay mt-4 font-[family-name:var(--font-syne)] text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="fade-up-delay-2 mt-5 max-w-2xl text-lg text-white/75">{post.excerpt}</p>
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
          <div className="mt-14 flex flex-wrap gap-2 border-t border-white/10 pt-8">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-white"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-10">
          <Link href="/" className="text-sm text-[var(--fg-muted)] hover:text-white">
            ← Back to essays
          </Link>
        </div>
      </div>
    </article>
  );
}
