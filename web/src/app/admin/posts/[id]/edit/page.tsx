import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { AdminErrorState } from "@/components/ui/States";
import { getAdminPost, getCategoriesAndTags } from "@/lib/posts";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const { post } = await getAdminPost(Number(id));
  return { title: post ? `Edit · ${post.title}` : "Edit Post" };
}

export default async function EditPostPage({ params }: { params: Params }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const [{ post, error }, { categories, tags, error: metaError }] = await Promise.all([
    getAdminPost(numericId),
    getCategoriesAndTags(),
  ]);

  if (!post && !error) notFound();

  return (
    <div className="space-y-4">
      {error || metaError ? <AdminErrorState message={error || metaError || ""} /> : null}
      {post ? <PostEditor post={post} categories={categories} tags={tags} /> : null}
    </div>
  );
}
