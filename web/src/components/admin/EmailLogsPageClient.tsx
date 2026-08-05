"use client";

import { useEffect, useState } from "react";
import { EmailLogsTable } from "@/components/admin/EmailLogsTable";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { EmailLog } from "@/lib/types";

export function EmailLogsPageClient() {
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("email_logs")
        .select(
          "id, post_id, email, status, timestamp, attempts, error_message, retry_at, posts ( id, title, slug )"
        )
        .order("timestamp", { ascending: false })
        .limit(300);
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setLogs((data || []) as unknown as EmailLog[]);
    }
    void load();
  }, []);

  if (error) return <AdminErrorState message={error} />;
  if (!logs) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Email logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Delivery attempts for post notification emails.
        </p>
      </div>
      <EmailLogsTable logs={logs} />
    </div>
  );
}
