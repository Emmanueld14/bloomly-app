"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Profile } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [active, setActive] = useState("all");

  const filtered = useMemo(() => {
    let rows = [...users];
    if (role !== "all") rows = rows.filter((u) => u.role === role);
    if (active === "active") rows = rows.filter((u) => u.is_active !== false);
    if (active === "inactive") rows = rows.filter((u) => u.is_active === false);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (u) =>
          (u.username || "").toLowerCase().includes(q) ||
          (u.display_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [users, search, role, active]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input
          className="admin-input md:col-span-2"
          placeholder="Search username, name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select className="admin-input" value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">
        {filtered.length} user{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No users match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const inactive = user.is_active === false;
                return (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-400 to-sky-500 text-[0.65rem] font-bold text-white">
                          {user.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (user.username || user.display_name || "?").charAt(0).toUpperCase()
                          )}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.username || user.display_name || "Untitled"}
                            {user.id === currentUserId ? (
                              <span className="ml-2 text-xs text-teal-700">(you)</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{user.role}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {inactive ? "Deactivated" : "Active"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/edit/?id=${user.id}`}
                        className="admin-btn admin-btn-secondary !px-2 !py-1 text-xs"
                      >
                        Manage
                      </Link>
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
