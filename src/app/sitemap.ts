import type { MetadataRoute } from "next";
import { policies } from "@/content/policies";
import { rooms } from "@/content/site";
import { contentPages, pageOrder } from "@/content/pages";
import { abs } from "@/lib/seo";

/**
 * Serves /sitemap.xml, built from the content files so pages appear automatically.
 *
 * Left out on purpose: /book, which is noindex, and any page still marked `draft` in pages.ts.
 * A sitemap is a list of pages you want indexed, so a page with unwritten copy doesn't belong
 * in it — and it's noindex anyway, which would just make the two contradict each other.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const live = pageOrder.filter((slug) => !contentPages[slug].draft);

  return [
    { url: abs("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    ...live.map((slug) => ({
      url: abs(`/${slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // The per-room pages ride on the /rooms page's draft flag.
    ...(contentPages.rooms.draft
      ? []
      : rooms.map((r) => ({
          url: abs(`/rooms/${r.slug}`),
          lastModified,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }))),
    ...Object.keys(policies).map((slug) => ({
      url: abs(`/policies/${slug}`),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
