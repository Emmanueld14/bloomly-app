"use client";

import { useState } from "react";

export type MediaItem = {
  name: string;
  url: string;
  updatedAt?: string;
};

export function MediaGrid({
  items,
  onDelete,
}: {
  items: MediaItem[];
  onDelete?: (item: MediaItem) => Promise<void> | void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy URL:", url);
    }
  }

  async function remove(item: MediaItem) {
    if (!onDelete) return;
    if (!confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    setPending(item.name);
    try {
      await onDelete(item);
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500">
        No images in the blog-images bucket yet. Upload above or from the post editor.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.url}
          className="overflow-hidden rounded-lg border border-[var(--admin-border)] bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.name} className="aspect-square w-full object-cover" />
          <div className="space-y-2 p-3">
            <p className="truncate text-xs text-gray-600" title={item.name}>
              {item.name}
            </p>
            <button
              type="button"
              onClick={() => void copyUrl(item.url)}
              className="admin-btn admin-btn-secondary w-full !py-1.5 text-xs"
            >
              {copied === item.url ? "Copied!" : "Copy URL"}
            </button>
            {onDelete ? (
              <button
                type="button"
                disabled={pending === item.name}
                onClick={() => void remove(item)}
                className="admin-btn admin-btn-danger w-full !py-1.5 text-xs"
              >
                {pending === item.name ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
