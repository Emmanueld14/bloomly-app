import { Suspense } from "react";
import { EditorPageClient } from "@/components/admin/EditorPageClient";
import { AdminLoadingState } from "@/components/ui/States";

export default function NewPostPage() {
  return (
    <Suspense fallback={<AdminLoadingState />}>
      <EditorPageClient mode="new" />
    </Suspense>
  );
}
