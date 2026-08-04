import Link from "next/link";
import { AdminErrorState } from "@/components/ui/States";
import { getBlogStats } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const { stats, error } = await getBlogStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Quick overview of your editorial queue.</p>
        </div>
        <Link href="/admin/posts/new" className="admin-btn admin-btn-primary">
          + New Post
        </Link>
      </div>

      {error ? <AdminErrorState message={error} /> : null}

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
          <Link href="/admin/posts" className="admin-btn admin-btn-secondary">
            Manage posts
          </Link>
          <Link href="/admin/media" className="admin-btn admin-btn-secondary">
            Media library
          </Link>
          <Link href="/admin/categories" className="admin-btn admin-btn-secondary">
            Categories & tags
          </Link>
        </div>
      </div>
    </div>
  );
}
