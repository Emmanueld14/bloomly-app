import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { hostname, protocol } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    remotePatterns.push({
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    });
  }
} catch {
  // ignore invalid URL at build time
}

remotePatterns.push({
  protocol: "https",
  hostname: "*.supabase.co",
  pathname: "/storage/v1/object/public/**",
});

const nextConfig: NextConfig = {
  // Static export so Cloudflare Pages can serve AetherPress admin at /admin
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
