"use client";

import { useEffect, useState } from "react";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { Category, Tag } from "@/lib/types";

export function TaxonomyPageClient() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [categoriesRes, tagsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("tags").select("*").order("name"),
      ]);
      if (categoriesRes.error || tagsRes.error) {
        setError(categoriesRes.error?.message || tagsRes.error?.message || "Failed to load");
        return;
      }
      setCategories((categoriesRes.data || []) as Category[]);
      setTags((tagsRes.data || []) as Tag[]);
    }
    void load();
  }, []);

  if (error) return <AdminErrorState message={error} />;
  if (!categories) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Categories & Tags</h1>
        <p className="mt-1 text-sm text-gray-500">Simple CRUD for organizing essays.</p>
      </div>
      <TaxonomyManager categories={categories} tags={tags} />
    </div>
  );
}
