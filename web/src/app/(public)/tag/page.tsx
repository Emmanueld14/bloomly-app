"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

export default function TagsIndexPage() {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase.from("tags").select("*").order("name");
      if (fetchError) {
        setError(fetchError.message);
        setTags([]);
        return;
      }
      setTags((data || []) as Tag[]);
    }
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
      <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-bold tracking-tight md:text-5xl">
        Tags
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">Follow threads across essays.</p>
      <div className="mt-10">
        {tags === null ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : tags.length === 0 ? (
          <EmptyState title="No tags yet" />
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}/`}
                className="border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
