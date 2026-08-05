import { Suspense } from "react";
import { EmailLogDetailClient } from "@/components/admin/EmailLogDetailClient";
import { AdminLoadingState } from "@/components/ui/States";

export default function EmailLogDetailPage() {
  return (
    <Suspense fallback={<AdminLoadingState />}>
      <EmailLogDetailClient />
    </Suspense>
  );
}
