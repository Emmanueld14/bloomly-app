import Link from "next/link";
import { PostsTable } from "@/components/admin/PostsTable";
import { AdminErrorState } from "@/components/ui/States";
import { getAdminPosts, getCategoriesAndTags } from "@/lib/posts";

export const metadata = { title: "Posts" };

export default async function AdminPostsPage() {
  const [{ posts, error }, { categories, error: metaError }] = await Promise.all([
    getAdminPosts({}),
    getCategoriesAndTags(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Posts</h1>
          <p className="mt-1 text-sm text-gray-500">Sort, filter, and manage every essay.</p>
        </div>
        <Link href="/admin/posts/new" className="admin-btn admin-btn-primary">
          + New Post
        </Link>
      </div>

      {error || metaError ? <AdminErrorState message={error || metaError || ""} /> : null}

      <PostsTable posts={posts} categories={categories} />
    </div>
  );
}
