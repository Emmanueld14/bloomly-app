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

// Allow common Supabase storage hosts when env is not baked in yet
remotePatterns.push({
  protocol: "https",
  hostname: "*.supabase.co",
  pathname: "/storage/v1/object/public/**",
});

const nextConfig: NextConfig = {
  images: { remotePatterns },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
