"use client";

import { useEffect, useState } from "react";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";

export function MediaPageClient() {
  const [items, setItems] = useState<{ name: string; url: string; updatedAt?: string }[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: listError } = await supabase.storage.from("blog-images").list("", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (listError) throw listError;

        const next: { name: string; url: string; updatedAt?: string }[] = [];
        for (const entry of data || []) {
          if (!entry.metadata) {
            const { data: nested } = await supabase.storage.from("blog-images").list(entry.name, {
              limit: 100,
              sortBy: { column: "created_at", order: "desc" },
            });
            for (const file of nested || []) {
              if (!file.metadata) continue;
              const path = `${entry.name}/${file.name}`;
              const { data: publicData } = supabase.storage.from("blog-images").getPublicUrl(path);
              next.push({
                name: path,
                url: publicData.publicUrl,
                updatedAt: file.updated_at || file.created_at || undefined,
              });
            }
            continue;
          }
          const { data: publicData } = supabase.storage.from("blog-images").getPublicUrl(entry.name);
          next.push({
            name: entry.name,
            url: publicData.publicUrl,
            updatedAt: entry.updated_at || entry.created_at || undefined,
          });
        }
        setItems(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load media");
        setItems([]);
      }
    }
    void load();
  }, []);

  if (error) return <AdminErrorState message={error} />;
  if (!items) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Media</h1>
        <p className="mt-1 text-sm text-gray-500">
          Images uploaded to the Supabase <code>blog-images</code> bucket.
        </p>
      </div>
      <MediaGrid items={items} />
    </div>
  );
}
