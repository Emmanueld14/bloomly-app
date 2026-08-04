import { PostPageClient } from "@/components/public/PostPageClient";

export function generateStaticParams() {
  // Static export requires at least one path; real slugs load client-side.
  return [{ slug: "_" }];
}

export default function PostPage() {
  return <PostPageClient />;
}
