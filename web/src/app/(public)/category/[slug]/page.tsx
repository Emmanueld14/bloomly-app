import { FilterPageClient } from "@/components/public/FilterPageClient";

export function generateStaticParams() {
  return [{ slug: "_" }];
}

export default function CategoryPage() {
  return <FilterPageClient kind="category" />;
}
