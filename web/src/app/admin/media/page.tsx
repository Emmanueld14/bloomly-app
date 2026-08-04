import { MediaGrid } from "@/components/admin/MediaGrid";
import { AdminErrorState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  let items: { name: string; url: string; updatedAt?: string }[] = [];
  let error: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error: listError } = await supabase.storage.from("blog-images").list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (listError) throw listError;

    for (const entry of data || []) {
      // Folders appear without file metadata
      if (!entry.metadata) {
        const { data: nested } = await supabase.storage.from("blog-images").list(entry.name, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
        for (const file of nested || []) {
          if (!file.metadata) continue;
          const path = `${entry.name}/${file.name}`;
          const { data: publicData } = supabase.storage.from("blog-images").getPublicUrl(path);
          items.push({
            name: path,
            url: publicData.publicUrl,
            updatedAt: file.updated_at || file.created_at || undefined,
          });
        }
        continue;
      }

      const { data: publicData } = supabase.storage.from("blog-images").getPublicUrl(entry.name);
      items.push({
        name: entry.name,
        url: publicData.publicUrl,
        updatedAt: entry.updated_at || entry.created_at || undefined,
      });
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load media";
    items = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Media</h1>
        <p className="mt-1 text-sm text-gray-500">
          Images uploaded to the Supabase <code>blog-images</code> bucket.
        </p>
      </div>
      {error ? <AdminErrorState message={error} /> : null}
      <MediaGrid items={items} />
    </div>
  );
}
