"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import type { BlogStats } from "@/lib/types";

export function DashboardClient() {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase.from("posts").select("status");
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      const rows = data || [];
      setStats({
        total: rows.length,
        drafts: rows.filter((r) => (r.status || "draft") === "draft").length,
        published: rows.filter((r) => r.status === "published").length,
        scheduled: rows.filter((r) => r.status === "scheduled").length,
      });
    }
    void load();
  }, []);

  if (error) return <AdminErrorState message={error} />;
  if (!stats) return <AdminLoadingState />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Quick overview of your editorial queue.</p>
        </div>
        <Link href="/admin/posts/new/" className="admin-btn admin-btn-primary">
          + New Post
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total posts", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Drafts", value: stats.drafts },
          { label: "Scheduled", value: stats.scheduled },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[var(--admin-border)] bg-white p-5"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--admin-border)] bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Shortcuts</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/posts/" className="admin-btn admin-btn-secondary">
            Manage posts
          </Link>
          <Link href="/admin/media/" className="admin-btn admin-btn-secondary">
            Media library
          </Link>
          <Link href="/admin/categories/" className="admin-btn admin-btn-secondary">
            Categories & tags
          </Link>
          <Link href="/admin/users/" className="admin-btn admin-btn-secondary">
            Users
          </Link>
        </div>
      </div>
    </div>
  );
}
