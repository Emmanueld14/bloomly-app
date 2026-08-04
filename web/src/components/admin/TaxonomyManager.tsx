"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category, Tag } from "@/lib/types";
import { slugify } from "@/lib/utils";

type Kind = "categories" | "tags";

function TaxonomySection({
  kind,
  title,
  items,
}: {
  kind: Kind;
  title: string;
  items: Array<Category | Tag>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  async function createItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const nextSlug = slug || slugify(name);
    if (!name.trim() || !nextSlug) {
      setError("Name and slug are required.");
      return;
    }
    const { error: insertError } = await supabase.from(kind).insert({
      name: name.trim(),
      slug: nextSlug,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setSlug("");
    startTransition(() => router.refresh());
  }

  async function saveEdit(id: string) {
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from(kind)
      .update({ name: editName.trim(), slug: editSlug.trim() || slugify(editName) })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingId(null);
    startTransition(() => router.refresh());
  }

  async function removeItem(id: string) {
    if (!confirm(`Delete this ${kind === "categories" ? "category" : "tag"}?`)) return;
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from(kind).delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-lg border border-[var(--admin-border)] bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      <form onSubmit={createItem} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="admin-input"
          placeholder="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
          }}
        />
        <input
          className="admin-input font-mono text-xs"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
        <button type="submit" className="admin-btn admin-btn-primary" disabled={pending}>
          Add
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="mt-5 divide-y divide-gray-100">
        {items.length === 0 ? (
          <li className="py-6 text-sm text-gray-500">Nothing here yet.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              {editingId === item.id ? (
                <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input
                    className="admin-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="admin-input font-mono text-xs"
                    value={editSlug}
                    onChange={(e) => setEditSlug(slugify(e.target.value))}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => void saveEdit(item.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">/{item.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary !py-1 text-xs"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditName(item.name);
                        setEditSlug(item.slug);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger !py-1 text-xs"
                      onClick={() => void removeItem(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: Category[];
  tags: Tag[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <TaxonomySection kind="categories" title="Categories" items={categories} />
      <TaxonomySection kind="tags" title="Tags" items={tags} />
    </div>
  );
}
