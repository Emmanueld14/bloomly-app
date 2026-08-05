"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EmailLog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function EmailLogsTable({ logs }: { logs: EmailLog[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    let rows = [...logs];
    if (status !== "all") {
      rows = rows.filter((l) => (l.status || "").toLowerCase() === status);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.email || "").toLowerCase().includes(q) ||
          (l.posts?.title || "").toLowerCase().includes(q) ||
          (l.posts?.slug || "").toLowerCase().includes(q) ||
          String(l.post_id).includes(q)
      );
    }
    return rows;
  }, [logs, search, status]);

  const statuses = useMemo(() => {
    const set = new Set(logs.map((l) => (l.status || "").toLowerCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="admin-input md:col-span-2"
          placeholder="Search email, post title, slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500">
        {filtered.length} log{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Post</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No email logs match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{log.email}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="max-w-[14rem] truncate">
                      {log.posts?.title || `Post #${log.post_id}`}
                    </div>
                    {log.posts?.slug ? (
                      <div className="text-xs text-gray-500">/{log.posts.slug}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">{log.status}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">{log.attempts ?? 1}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/email-logs/detail/?id=${log.id}`}
                      className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                    >
                      Open
                    </Link>
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
