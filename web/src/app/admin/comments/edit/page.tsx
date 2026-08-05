import { Suspense } from "react";
import { CommentDetailClient } from "@/components/admin/CommentDetailClient";
import { AdminLoadingState } from "@/components/ui/States";

export default function EditCommentPage() {
  return (
    <Suspense fallback={<AdminLoadingState />}>
      <CommentDetailClient />
    </Suspense>
  );
}
