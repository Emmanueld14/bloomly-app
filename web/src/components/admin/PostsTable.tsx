"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, PostWithRelations } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function PostsTable({
  posts,
  categories,
}: {
  posts: PostWithRelations[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState("date_desc");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = [...posts];
    if (status !== "all") rows = rows.filter((p) => (p.status || "draft") === status);
    if (categoryId !== "all") rows = rows.filter((p) => p.category_id === categoryId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.excerpt || "").toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      if (sort === "title_asc") return a.title.localeCompare(b.title);
      if (sort === "date_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return rows;
  }, [posts, search, status, categoryId, sort]);

  async function removePost(id: number) {
    if (!confirm("Delete this post permanently?")) return;
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("posts").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function togglePublish(post: PostWithRelations) {
    setError(null);
    const supabase = createClient();
    const publishing = (post.status || "draft") !== "published";
    const payload = publishing
      ? {
          status: "published",
          published: true,
          published_at: post.published_at || new Date().toISOString(),
        }
      : {
          status: "draft",
          published: false,
        };

    const { error: updateError } = await supabase.from("posts").update(payload).eq("id", post.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input
          className="admin-input md:col-span-2"
          placeholder="Search title, slug, excerpt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <select
          className="admin-input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <select className="admin-input max-w-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="date_desc">Newest updated</option>
          <option value="date_asc">Oldest created</option>
          <option value="title_asc">Title A–Z</option>
        </select>
        <p className="text-xs text-gray-500">
          {filtered.length} post{filtered.length === 1 ? "" : "s"}
          {pending ? " · refreshing…" : ""}
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No posts match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((post) => (
                <tr key={post.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{post.title}</div>
                    <div className="text-xs text-gray-500">/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">{post.status || "draft"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {post.categories?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(post.updated_at || post.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => togglePublish(post)}
                        className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                      >
                        {(post.status || "draft") === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePost(post.id)}
                        className="admin-btn admin-btn-danger !px-2 !py-1 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
