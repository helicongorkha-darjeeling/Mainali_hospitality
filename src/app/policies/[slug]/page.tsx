import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hotel } from "@/content/site";
import { policies, policyLinks } from "@/content/policies";
import { JsonLd } from "@/components/JsonLd";
import { policySchema } from "@/lib/schema";

type Slug = keyof typeof policies;

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = policies[slug as Slug];
  if (!p) return {};
  return {
    title: p.title, // the layout template adds "· Hotel Teesta"
    // Each policy needs its own description; otherwise all three inherit the site-wide one.
    description: p.intro,
    // And its own canonical, so it doesn't inherit the layout's "/".
    alternates: { canonical: `/policies/${slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = policies[slug as Slug];
  if (!p) notFound();

  return (
    <div className="min-h-[100svh] bg-ink px-5 pb-24 pt-8 sm:px-8">
      <JsonLd data={policySchema(slug, p.title, p.intro)} />
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gold-bright">
          ← {hotel.name}
        </Link>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Policies">
          {policyLinks.map((l) => (
            <Link
              key={l.slug}
              href={`/policies/${l.slug}`}
              className={`exp-chip ${l.slug === slug ? "exp-chip-gold" : ""}`}
              aria-current={l.slug === slug ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <h1 className="h-section mt-8">{p.title}</h1>
        <p className="sub mt-4">{p.intro}</p>
        <div className="mt-10 space-y-8">
          {p.sections.map(([h, body]) => (
            <section key={h} className="border-t border-ivory/10 pt-6">
              <h2 className="text-lg font-semibold">{h}</h2>
              <p className="mt-2 leading-relaxed text-ivory/75">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 text-xs text-ivory/40">Last updated October 2026 · {hotel.brand}</p>
      </div>
    </div>
  );
}
