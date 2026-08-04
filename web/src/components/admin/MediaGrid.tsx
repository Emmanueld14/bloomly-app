"use client";

import { useState } from "react";

type MediaItem = {
  name: string;
  url: string;
  updatedAt?: string;
};

export function MediaGrid({ items }: { items: MediaItem[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy URL:", url);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500">
        No images in the blog-images bucket yet. Upload from the post editor.
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
          </div>
        </div>
      ))}
    </div>
  );
}
