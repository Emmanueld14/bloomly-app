"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { BlogComment } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function CommentDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [comment, setComment] = useState<BlogComment | null | undefined>(undefined);
  const [postTitle, setPostTitle] = useState<string | null>(null);
  const [authorLabel, setAuthorLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        setError("Missing comment id.");
        setComment(null);
        return;
      }
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("comments")
        .select("id, post_id, nick, text, timestamp, user_id, status")
        .eq("id", id)
        .maybeSingle();
      if (fetchError) {
        setError(fetchError.message);
        setComment(null);
        return;
      }
      if (!data) {
        setComment(null);
        return;
      }
      const row = data as BlogComment;
      setComment(row);

      const { data: post } = await supabase
        .from("posts")
        .select("title, slug")
        .eq("slug", row.post_id)
        .maybeSingle();
      setPostTitle(post?.title || null);

      if (row.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, display_name, email")
          .eq("id", row.user_id)
          .maybeSingle();
        setAuthorLabel(
          profile?.username || profile?.display_name || profile?.email || row.user_id
        );
      }
    }
    void load();
  }, [idParam]);

  async function setStatus(next: "visible" | "hidden") {
    if (!comment) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("comments")
      .update({ status: next })
      .eq("id", comment.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setComment({ ...comment, status: next });
  }

  async function remove() {
    if (!comment || !confirm("Delete this comment permanently?")) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", comment.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/admin/comments/");
  }

  if (error && comment === undefined) return <AdminErrorState message={error} />;
  if (comment === undefined) return <AdminLoadingState />;
  if (!comment) return <AdminErrorState message="Comment not found." />;

  const status = (comment.status || "visible") === "hidden" ? "hidden" : "visible";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/comments/" className="text-xs text-gray-500 hover:text-gray-800">
            ← Comments
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">Comment</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus(status === "hidden" ? "visible" : "hidden")}
            className="admin-btn admin-btn-secondary"
          >
            {status === "hidden" ? "Show on site" : "Hide from site"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="admin-btn admin-btn-danger"
          >
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Author nick</p>
            <p className="mt-1 text-sm text-gray-900">{comment.nick || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Text</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {comment.text}
            </p>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <div className="text-sm">
            <p className="font-medium text-gray-700">Status</p>
            <p className="mt-1 capitalize text-gray-900">{status}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">Posted</p>
            <p className="mt-1 text-gray-900">{formatDateTime(comment.timestamp)}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">Post</p>
            <p className="mt-1 text-gray-900">{postTitle || "—"}</p>
            <p className="text-xs text-gray-500">/{comment.post_id}</p>
            {comment.post_id ? (
              <a
                href={`/blog/${comment.post_id}/`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-teal-700 hover:underline"
              >
                View on site →
              </a>
            ) : null}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">Account</p>
            {comment.user_id ? (
              <>
                <p className="mt-1 text-gray-900">{authorLabel || comment.user_id}</p>
                <Link
                  href={`/admin/users/edit/?id=${comment.user_id}`}
                  className="mt-2 inline-block text-xs text-teal-700 hover:underline"
                >
                  Open user →
                </Link>
              </>
            ) : (
              <p className="mt-1 text-gray-500">Guest / no account linked</p>
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">ID</p>
            <p className="mt-1 font-mono text-xs text-gray-600">{comment.id}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
