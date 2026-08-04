"use client";

import { useEffect, useState } from "react";
import { UsersTable } from "@/components/admin/UsersTable";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

export function UsersPageClient() {
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in");
        return;
      }
      setCurrentUserId(user.id);
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, email, display_name, role")
        .order("created_at", { ascending: false });
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setUsers((data || []) as Profile[]);
    }
    void load();
  }, []);

  if (error) return <AdminErrorState message={error} />;
  if (!users) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Promote trusted accounts to admin. Everyone else stays a regular user.
        </p>
      </div>
      <UsersTable users={users} currentUserId={currentUserId} />
    </div>
  );
}
