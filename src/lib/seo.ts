/**
 * Shared SEO values. Used by metadata, robots.txt, sitemap.xml and the JSON-LD in schema.ts.
 *
 * siteUrl is hardcoded on purpose. It used to be gated on process.env.VERCEL, which meant any
 * build outside Vercel shipped http://localhost:3000 in its Open Graph tags. Canonical URLs and
 * social images must always point at the live site; Vercel marks preview deploys noindex itself.
 */
export const siteUrl = "https://www.mainalihospitality.com";

/** Absolute URL for a path, for canonical tags and the sitemap. */
export const abs = (path = "/") => new URL(path, siteUrl).toString();

/**
 * Crawlers that read pages to answer questions, rather than to train on them.
 * Letting these in is what makes the hotel quotable in AI answers.
 */
export const answerEngineBots = [
  "Googlebot", // Google Search, AI Overviews and AI Mode all crawl as Googlebot
  "Bingbot", // Bing, and the index behind Copilot
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User", // a person asking ChatGPT to open this page
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
  "DuckDuckBot",
];
