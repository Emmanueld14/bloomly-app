import { Suspense } from "react";
import { UserDetailClient } from "@/components/admin/UserDetailClient";
import { AdminLoadingState } from "@/components/ui/States";

export default function EditUserPage() {
  return (
    <Suspense fallback={<AdminLoadingState />}>
      <UserDetailClient />
    </Suspense>
  );
}
