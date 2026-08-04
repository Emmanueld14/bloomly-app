"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import TextareaAutosize from "react-textarea-autosize";
import { createClient } from "@/lib/supabase/client";
import type { Category, PostStatus, PostWithRelations, Tag } from "@/lib/types";
import { slugify } from "@/lib/utils";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  category_id: string;
  tag_ids: string[];
  status: PostStatus;
  scheduled_at: string;
};

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({
  post,
  categories,
  tags,
}: {
  post?: PostWithRelations | null;
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const slugEdited = useRef(Boolean(post?.slug));
  const [postId, setPostId] = useState<number | null>(post?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [autosaveNote, setAutosaveNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: post?.title || "",
    slug: post?.slug || "",
    excerpt: post?.excerpt || post?.summary || "",
    content: post?.content || "",
    featured_image_url: post?.featured_image_url || post?.cover_image_url || "",
    category_id: post?.category_id || "",
    tag_ids: (post?.post_tags || [])
      .map((pt) => pt.tags?.id || pt.tag_id)
      .filter(Boolean) as string[],
    status: ((post?.status as PostStatus) || "draft") as PostStatus,
    scheduled_at: toLocalInputValue(post?.scheduled_at),
  });

  useEffect(() => {
    if (slugEdited.current) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title]);

  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    if (!postId) return;
    const timer = setInterval(() => {
      void persist("draft", { silent: true, snapshot: formRef.current });
    }, 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function assertSlugUnique(slug: string, excludeId?: number | null) {
    let query = supabase.from("posts").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error: slugError } = await query.maybeSingle();
    if (slugError && slugError.code !== "PGRST116") throw slugError;
    if (data) throw new Error("Slug is already in use. Choose a unique slug.");
  }

  async function syncTags(id: number, tagIds: string[]) {
    const { error: deleteError } = await supabase.from("post_tags").delete().eq("post_id", id);
    if (deleteError) throw deleteError;
    if (tagIds.length === 0) return;
    const { error: insertError } = await supabase.from("post_tags").insert(
      tagIds.map((tag_id) => ({ post_id: id, tag_id }))
    );
    if (insertError) throw insertError;
  }

  async function persist(
    intent: "draft" | "publish" | "schedule",
    opts?: { silent?: boolean; snapshot?: FormState }
  ) {
    const current = opts?.snapshot || form;
    if (!opts?.silent) setSaving(true);
    setError(null);

    try {
      if (!current.title.trim()) {
        if (opts?.silent) return;
        throw new Error("Title is required.");
      }
      const slug = current.slug.trim() || slugify(current.title);
      if (!slug) throw new Error("Slug is required.");

      await assertSlugUnique(slug, postId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let status: PostStatus = "draft";
      let published = false;
      let published_at: string | null = post?.published_at || null;
      let scheduled_at: string | null = null;

      if (intent === "publish") {
        status = "published";
        published = true;
        published_at = new Date().toISOString();
      } else if (intent === "schedule") {
        if (!current.scheduled_at) throw new Error("Pick a schedule date/time.");
        status = "scheduled";
        published = false;
        scheduled_at = new Date(current.scheduled_at).toISOString();
        published_at = scheduled_at;
      } else if (current.status === "scheduled" && current.scheduled_at) {
        status = "scheduled";
        scheduled_at = new Date(current.scheduled_at).toISOString();
        published_at = scheduled_at;
      }

      const payload = {
        title: current.title.trim(),
        slug,
        excerpt: current.excerpt.trim() || null,
        summary: current.excerpt.trim() || null,
        content: current.content,
        featured_image_url: current.featured_image_url || null,
        cover_image_url: current.featured_image_url || null,
        category_id: current.category_id || null,
        category: categories.find((c) => c.id === current.category_id)?.name || null,
        status,
        published,
        published_at,
        scheduled_at,
        author_id: user?.id || null,
        url: `/posts/${slug}`,
        updated_at: new Date().toISOString(),
      };

      let id = postId;
      if (id) {
        const { error: updateError } = await supabase.from("posts").update(payload).eq("id", id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("posts")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;
        id = data.id as number;
        setPostId(id);
      }

      await syncTags(id!, current.tag_ids);
      setForm((prev) => ({ ...prev, slug, status }));

      if (opts?.silent) {
        setAutosaveNote(`Draft autosaved at ${new Date().toLocaleTimeString()}`);
      } else {
        setAutosaveNote(intent === "publish" ? "Published." : "Saved.");
        router.replace(`/admin/posts/${id}/edit`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      if (!opts?.silent) setSaving(false);
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      update("featured_image_url", data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {postId ? "Edit post" : "New post"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Markdown with live preview. Drafts autosave every 30 seconds once created.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/posts" className="admin-btn admin-btn-secondary">
            Back
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist("draft")}
            className="admin-btn admin-btn-secondary"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist(form.status === "scheduled" ? "schedule" : "publish")}
            className="admin-btn admin-btn-primary"
          >
            {form.status === "scheduled" ? "Schedule" : "Publish"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {autosaveNote ? <p className="text-xs text-teal-700">{autosaveNote}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">Title</span>
            <input
              className="admin-input"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">Slug</span>
            <input
              className="admin-input font-mono text-xs"
              required
              value={form.slug}
              onChange={(e) => {
                slugEdited.current = true;
                update("slug", slugify(e.target.value));
              }}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">Excerpt</span>
            <textarea
              className="admin-input min-h-24"
              value={form.excerpt}
              onChange={(e) => update("excerpt", e.target.value)}
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-gray-700">Content (Markdown)</span>
              <TextareaAutosize
                minRows={18}
                className="admin-input font-mono text-xs leading-relaxed"
                value={form.content}
                onChange={(e) => update("content", e.target.value)}
              />
            </label>
            <div className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Live preview</span>
              <div className="min-h-[28rem] rounded-lg border border-[var(--admin-border)] bg-white p-4 prose prose-sm max-w-none overflow-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {form.content || "_Nothing to preview yet._"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">Status</span>
            <select
              className="admin-input"
              value={form.status}
              onChange={(e) => update("status", e.target.value as PostStatus)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>

          {form.status === "scheduled" ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-gray-700">Schedule for</span>
              <input
                type="datetime-local"
                className="admin-input"
                value={form.scheduled_at}
                onChange={(e) => update("scheduled_at", e.target.value)}
              />
            </label>
          ) : null}

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">Category</span>
            <select
              className="admin-input"
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-gray-700">Tags</legend>
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-gray-100 p-2">
              {tags.length === 0 ? (
                <p className="text-xs text-gray-500">No tags yet. Create some in Categories & Tags.</p>
              ) : (
                tags.map((tag) => {
                  const checked = form.tag_ids.includes(tag.id);
                  return (
                    <label key={tag.id} className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          update(
                            "tag_ids",
                            checked
                              ? form.tag_ids.filter((id) => id !== tag.id)
                              : [...form.tag_ids, tag.id]
                          );
                        }}
                      />
                      {tag.name}
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>

          <div className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">Featured image</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            <input
              className="admin-input"
              placeholder="Or paste image URL"
              value={form.featured_image_url}
              onChange={(e) => update("featured_image_url", e.target.value)}
            />
            {form.featured_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.featured_image_url}
                alt=""
                className="mt-2 max-h-40 w-full rounded-md object-cover"
              />
            ) : null}
            {uploading ? <p className="text-xs text-gray-500">Uploading…</p> : null}
          </div>
        </aside>
      </div>
    </form>
  );
}
