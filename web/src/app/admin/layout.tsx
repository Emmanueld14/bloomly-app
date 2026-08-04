import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <div className="admin-shell">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
          <AdminNav />
          <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
        </div>
      </div>
    </AdminAuthGate>
  );
}
