import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    // Files in public/ have no content hash in their names, so they can't be cached forever:
    // replacing hero.mp4 reuses the URL. A day of caching with a week of stale-while-revalidate
    // gives repeat visitors an instant load while letting a replacement roll out within a day.
    const media = "public, max-age=86400, stale-while-revalidate=604800";
    return [
      { source: "/video/:path*", headers: [{ key: "Cache-Control", value: media }] },
      { source: "/textures/:path*", headers: [{ key: "Cache-Control", value: media }] },
      { source: "/images/:path*", headers: [{ key: "Cache-Control", value: media }] },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: media }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
