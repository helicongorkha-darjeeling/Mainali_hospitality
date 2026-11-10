import type { NextConfig } from "next";

/**
 * Content-Security-Policy: what the browser may load and where the page may send data.
 * If something is ever injected into a page, it can't pull in outside scripts or send what the guest
 * types to another site. The pages are prerendered, so scripts are allowed by origin, not by nonce
 * (a nonce needs every page rendered per request).
 *
 * Adding a third-party service (analytics, a payment gateway, a chat widget)? Its domains go here,
 * or the browser will block it: look for "Refused to…" in the browser console.
 */
const isDev = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`, // React needs eval in development only
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' data: blob:${isDev ? " ws:" : ""}`, // the site's own API only; ws: is the dev server's live reload
  "worker-src 'self' blob:",
  "frame-src https://www.google.com", // the map
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

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
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          // the site never asks for these, so nothing running in the page can either
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
