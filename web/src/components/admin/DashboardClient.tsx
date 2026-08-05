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
      const [postsRes, likesRes, commentsRes, emailRes] = await Promise.all([
        supabase.from("posts").select("status"),
        supabase.from("likes").select("count"),
        supabase.from("comments").select("status"),
        supabase.from("email_logs").select("status").limit(1000),
      ]);

      if (postsRes.error) {
        setError(postsRes.error.message);
        return;
      }

      const rows = postsRes.data || [];
      const likeTotal = (likesRes.data || []).reduce(
        (sum, row) => sum + (typeof row.count === "number" ? row.count : 0),
        0
      );
      const comments = commentsRes.data || [];
      const emails = emailRes.data || [];

      setStats({
        total: rows.length,
        drafts: rows.filter((r) => (r.status || "draft") === "draft").length,
        published: rows.filter((r) => r.status === "published").length,
        scheduled: rows.filter((r) => r.status === "scheduled").length,
        likes: likesRes.error ? 0 : likeTotal,
        commentsTotal: commentsRes.error ? 0 : comments.length,
        commentsHidden: commentsRes.error
          ? 0
          : comments.filter((c) => (c.status || "visible") === "hidden").length,
        emailSent: emailRes.error
          ? 0
          : emails.filter((e) => /sent|success|delivered/i.test(e.status || "")).length,
        emailFailed: emailRes.error
          ? 0
          : emails.filter((e) => /fail|error|bounce/i.test(e.status || "")).length,
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total likes", value: stats.likes ?? 0, href: undefined },
          {
            label: "Comments",
            value: stats.commentsTotal ?? 0,
            href: "/admin/comments/",
          },
          {
            label: "Hidden comments",
            value: stats.commentsHidden ?? 0,
            href: "/admin/comments/",
          },
          {
            label: "Email fails (recent)",
            value: stats.emailFailed ?? 0,
            href: "/admin/email-logs/",
          },
        ].map((stat) => {
          const body = (
            <>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{stat.value}</p>
            </>
          );
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-lg border border-[var(--admin-border)] bg-white p-5 transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              {body}
            </Link>
          ) : (
            <div
              key={stat.label}
              className="rounded-lg border border-[var(--admin-border)] bg-white p-5"
            >
              {body}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--admin-border)] bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Shortcuts</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/posts/" className="admin-btn admin-btn-secondary">
            Manage posts
          </Link>
          <Link href="/admin/comments/" className="admin-btn admin-btn-secondary">
            Moderate comments
          </Link>
          <Link href="/admin/media/" className="admin-btn admin-btn-secondary">
            Media library
          </Link>
          <Link href="/admin/email-logs/" className="admin-btn admin-btn-secondary">
            Email logs
          </Link>
          <Link href="/admin/categories/" className="admin-btn admin-btn-secondary">
            Categories & tags
          </Link>
          <Link href="/admin/users/" className="admin-btn admin-btn-secondary">
            Users
          </Link>
        </div>
        {(stats.emailSent ?? 0) > 0 ? (
          <p className="mt-4 text-xs text-gray-500">
            Recent email sample: {stats.emailSent} sent / delivered
            {(stats.emailFailed ?? 0) > 0 ? ` · ${stats.emailFailed} failed` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
