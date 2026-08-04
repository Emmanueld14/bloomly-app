import { PostEditor } from "@/components/admin/PostEditor";
import { AdminErrorState } from "@/components/ui/States";
import { getCategoriesAndTags } from "@/lib/posts";

export const metadata = { title: "New Post" };

export default async function NewPostPage() {
  const { categories, tags, error } = await getCategoriesAndTags();

  return (
    <div>
      {error ? <AdminErrorState message={error} /> : null}
      <PostEditor categories={categories} tags={tags} />
    </div>
  );
}
