"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaGrid, type MediaItem } from "@/components/admin/MediaGrid";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";

async function listMedia(): Promise<MediaItem[]> {
  const supabase = createClient();
  const { data, error: listError } = await supabase.storage.from("blog-images").list("", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (listError) throw listError;

  const next: MediaItem[] = [];
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
  return next;
}

export function MediaPageClient() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listMedia();
      setItems(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("blog-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;
      setNote(`Uploaded ${path}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(item: MediaItem) {
    setError(null);
    setNote(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.storage.from("blog-images").remove([item.name]);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setNote(`Deleted ${item.name}`);
    await load();
  }

  if (error && !items) return <AdminErrorState message={error} />;
  if (!items) return <AdminLoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Media</h1>
          <p className="mt-1 text-sm text-gray-500">
            Images in the Supabase <code>blog-images</code> bucket.
          </p>
        </div>
        <label className="admin-btn admin-btn-primary cursor-pointer">
          {uploading ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onUpload(file);
            }}
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {note}
        </p>
      ) : null}

      <MediaGrid items={items} onDelete={onDelete} />
    </div>
  );
}
