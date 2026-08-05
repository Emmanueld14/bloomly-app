"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/", label: "Dashboard" },
  { href: "/admin/posts/", label: "Posts" },
  { href: "/admin/comments/", label: "Comments" },
  { href: "/admin/media/", label: "Media" },
  { href: "/admin/categories/", label: "Categories & Tags" },
  { href: "/admin/email-logs/", label: "Email logs" },
  { href: "/admin/users/", label: "Users" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col border-b border-[var(--admin-border)] bg-white md:min-h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="px-4 py-4">
        <BrandLogo
          href="/"
          imgClassName="h-8 w-auto max-w-[140px] object-contain"
        />
        <p className="mt-1 text-xs font-medium text-gray-500">Admin · Writing desk</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:px-3 md:pb-0">
        {links.map((link) => {
          const active =
            link.href === "/admin/"
              ? pathname === "/admin" || pathname === "/admin/"
              : pathname.startsWith(link.href.replace(/\/$/, ""));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                active ? "bg-teal-50 font-medium text-teal-800" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 border-t border-[var(--admin-border)] p-3">
        <Link href="/" className="block text-xs text-gray-500 hover:text-gray-800">
          View public site →
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
