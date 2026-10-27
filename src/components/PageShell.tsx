import Link from "next/link";
import { hotel } from "@/content/site";
import { contentPages, pageOrder, type PageSlug } from "@/content/pages";

/**
 * Shared frame for the standalone content pages, matching the policy pages.
 * The cross-links between these pages are the internal linking that gets them crawled at all:
 * the homepage navigation is all #anchors, so without this they'd only be reachable from sitemap.xml.
 */
export function PageShell({ slug, children }: { slug: PageSlug; children: React.ReactNode }) {
  const page = contentPages[slug];
  return (
    <div className="min-h-[100svh] bg-ink px-5 pb-24 pt-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gold-bright">
          ← {hotel.name}
        </Link>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Pages">
          {pageOrder.map((s) => (
            <Link
              key={s}
              href={`/${s}`}
              className={`exp-chip ${s === slug ? "exp-chip-gold" : ""}`}
              aria-current={s === slug ? "page" : undefined}
            >
              {contentPages[s].nav}
            </Link>
          ))}
        </nav>

        <h1 className="h-section mt-8">{page.title}</h1>
        {page.draft && (
          <p className="mt-4 rounded-lg border border-dashed border-amber-400/40 bg-amber-400/5 px-4 py-3 text-xs text-amber-200/80">
            Draft. This page is set to <code>noindex</code> and is not in the sitemap. Fill in the
            copy marked below, then set <code>draft: false</code> for this page in{" "}
            <code>src/content/pages.ts</code>.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Stands in for copy that hasn't been written. Visible on the page so nothing is forgotten,
 * and the page it sits on stays `noindex` until it's gone.
 */
export function Needed({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-ivory/25 bg-ivory/[0.03] px-4 py-3 text-sm text-ivory/45">
      <span className="mr-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-200/70">
        Copy needed
      </span>
      {children}
    </p>
  );
}
