"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentsTable } from "@/components/admin/CommentsTable";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { BlogComment } from "@/lib/types";

export function CommentsPageClient() {
  const [comments, setComments] = useState<BlogComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("comments")
      .select("id, post_id, nick, text, timestamp, user_id, status")
      .order("timestamp", { ascending: false })
      .limit(500);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setComments((data || []) as BlogComment[]);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !comments) return <AdminErrorState message={error} />;
  if (!comments) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Comments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Moderate reader comments — hide, restore, or delete.
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <CommentsTable comments={comments} onChanged={load} />
    </div>
  );
}
