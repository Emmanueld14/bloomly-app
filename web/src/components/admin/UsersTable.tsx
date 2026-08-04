"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function setRole(id: string, role: "admin" | "user") {
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
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
                <td className="px-4 py-3">
                  {user.id === currentUserId ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : user.role === "admin" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void setRole(user.id, "user")}
                      className="admin-btn admin-btn-secondary !py-1 text-xs"
                    >
                      Make user
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void setRole(user.id, "admin")}
                      className="admin-btn admin-btn-primary !py-1 text-xs"
                    >
                      Make admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
