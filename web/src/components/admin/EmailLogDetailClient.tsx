"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { EmailLog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function EmailLogDetailClient() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [log, setLog] = useState<EmailLog | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        setError("Missing log id.");
        setLog(null);
        return;
      }
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("email_logs")
        .select(
          "id, post_id, email, status, timestamp, attempts, error_message, retry_at, posts ( id, title, slug )"
        )
        .eq("id", id)
        .maybeSingle();
      if (fetchError) {
        setError(fetchError.message);
        setLog(null);
        return;
      }
      setLog((data || null) as EmailLog | null);
    }
    void load();
  }, [idParam]);

  if (error) return <AdminErrorState message={error} />;
  if (log === undefined) return <AdminLoadingState />;
  if (!log) return <AdminErrorState message="Email log not found." />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/email-logs/" className="text-xs text-gray-500 hover:text-gray-800">
          ← Email logs
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Email delivery</h1>
        <p className="mt-1 text-sm text-gray-500">{log.email}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Recipient</p>
            <p className="mt-1 text-sm text-gray-900">{log.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Post</p>
            <p className="mt-1 text-sm text-gray-900">
              {log.posts?.title || `Post #${log.post_id}`}
            </p>
            {log.posts?.slug ? (
              <p className="text-xs text-gray-500">/{log.posts.slug}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Error message</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
              {log.error_message || "—"}
            </p>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <div className="text-sm">
            <p className="font-medium text-gray-700">Status</p>
            <p className="mt-1 capitalize text-gray-900">{log.status}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">Attempts</p>
            <p className="mt-1 tabular-nums text-gray-900">{log.attempts ?? 1}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">Logged</p>
            <p className="mt-1 text-gray-900">{formatDateTime(log.timestamp)}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">Retry at</p>
            <p className="mt-1 text-gray-900">{formatDateTime(log.retry_at) || "—"}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">ID</p>
            <p className="mt-1 font-mono text-xs text-gray-600">{log.id}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
