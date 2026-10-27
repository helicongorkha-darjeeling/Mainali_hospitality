import type { MetadataRoute } from "next";
import { policies } from "@/content/policies";
import { abs } from "@/lib/seo";

/**
 * Serves /sitemap.xml, built from the content files so new policy pages appear automatically.
 * /book is left out: it's noindex, and a sitemap is a list of pages you want indexed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: abs("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    ...Object.keys(policies).map((slug) => ({
      url: abs(`/policies/${slug}`),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
