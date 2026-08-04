import { FilterPageClient } from "@/components/public/FilterPageClient";

export function generateStaticParams() {
  return [{ slug: "_" }];
}

export default function TagPage() {
  return <FilterPageClient kind="tag" />;
}
