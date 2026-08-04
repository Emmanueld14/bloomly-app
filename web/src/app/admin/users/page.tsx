import { UsersTable } from "@/components/admin/UsersTable";
import { AdminErrorState } from "@/components/ui/States";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const { ok, user } = await requireAdmin();
  if (!ok || !user) {
    return <AdminErrorState message="Admin access required." />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Promote trusted accounts to admin. Everyone else stays a regular user.
        </p>
      </div>
      {error ? <AdminErrorState message={error.message} /> : null}
      <UsersTable users={(data || []) as Profile[]} currentUserId={user.id} />
    </div>
  );
}
