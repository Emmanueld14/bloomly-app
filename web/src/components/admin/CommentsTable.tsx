"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BlogComment } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function commentStatus(c: BlogComment) {
  return (c.status || "visible") === "hidden" ? "hidden" : "visible";
}

export function CommentsTable({
  comments,
  onChanged,
}: {
  comments: BlogComment[];
  onChanged: () => Promise<void> | void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = [...comments];
    if (status !== "all") {
      rows = rows.filter((c) => commentStatus(c) === status);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          (c.text || "").toLowerCase().includes(q) ||
          (c.nick || "").toLowerCase().includes(q) ||
          (c.post_id || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [comments, search, status]);

  async function setCommentStatus(id: number, next: "visible" | "hidden") {
    setPendingId(id);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("comments")
      .update({ status: next })
      .eq("id", id);
    setPendingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await onChanged();
  }

  async function removeComment(id: number) {
    if (!confirm("Delete this comment permanently?")) return;
    setPendingId(id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", id);
    setPendingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="admin-input md:col-span-2"
          placeholder="Search comment, nick, post slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">
        {filtered.length} comment{filtered.length === 1 ? "" : "s"}
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Comment</th>
              <th className="px-4 py-3 font-medium">Post</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No comments match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((comment) => {
                const st = commentStatus(comment);
                const busy = pendingId === comment.id;
                return (
                  <tr key={comment.id} className="border-b border-gray-100 last:border-0">
                    <td className="max-w-md px-4 py-3">
                      <div className="font-medium text-gray-900">{comment.nick || "Anonymous"}</div>
                      <div className="mt-0.5 line-clamp-2 text-gray-600">{comment.text}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">/{comment.post_id}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{st}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDateTime(comment.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/comments/edit/?id=${comment.id}`}
                          className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void setCommentStatus(
                              comment.id,
                              st === "hidden" ? "visible" : "hidden"
                            )
                          }
                          className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                        >
                          {st === "hidden" ? "Show" : "Hide"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeComment(comment.id)}
                          className="admin-btn admin-btn-danger !px-2 !py-1 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
