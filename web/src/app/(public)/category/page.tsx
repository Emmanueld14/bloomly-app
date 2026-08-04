"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

export default function CategoriesIndexPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (fetchError) {
        setError(fetchError.message);
        setCategories([]);
        return;
      }
      setCategories((data || []) as Category[]);
    }
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
      <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-bold tracking-tight md:text-5xl">
        Categories
      </h1>
      <p className="mt-3 text-[var(--fg-muted)]">Browse essays by theme.</p>
      <div className="mt-10">
        {categories === null ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : categories.length === 0 ? (
          <EmptyState title="No categories yet" />
        ) : (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/category/${category.slug}/`}
                  className="flex items-center justify-between py-5 transition hover:text-[var(--accent)]"
                >
                  <span className="font-[family-name:var(--font-manrope)] text-xl font-semibold">
                    {category.name}
                  </span>
                  <span className="text-sm text-[var(--fg-muted)]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
