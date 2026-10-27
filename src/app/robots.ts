import type { MetadataRoute } from "next";
import { abs, answerEngineBots } from "@/lib/seo";

/**
 * Serves /robots.txt.
 *
 * Everything is open except the API routes. The answer-engine crawlers get their own named groups:
 * a crawler that finds its own name in robots.txt ignores the "*" group entirely, so each group has
 * to repeat the same rules. Naming them is not strictly necessary (no rule means allowed), but it
 * states the intent, and it stops a future "Disallow: /" under "*" from quietly cutting off AI search.
 *
 * /book is deliberately crawlable: it carries its own `noindex`, and a page blocked here can never
 * be read, so the noindex would never be seen.
 */
export default function robots(): MetadataRoute.Robots {
  const rules = { allow: "/", disallow: "/api/" };
  return {
    rules: [
      { userAgent: "*", ...rules },
      ...answerEngineBots.map((userAgent) => ({ userAgent, ...rules })),
    ],
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
