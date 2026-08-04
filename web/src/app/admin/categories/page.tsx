import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { AdminErrorState } from "@/components/ui/States";
import { getCategoriesAndTags } from "@/lib/posts";

export const metadata = { title: "Categories & Tags" };

export default async function CategoriesPage() {
  const { categories, tags, error } = await getCategoriesAndTags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Categories & Tags</h1>
        <p className="mt-1 text-sm text-gray-500">Simple CRUD for organizing essays.</p>
      </div>
      {error ? <AdminErrorState message={error} /> : null}
      <TaxonomyManager categories={categories} tags={tags} />
    </div>
  );
}
