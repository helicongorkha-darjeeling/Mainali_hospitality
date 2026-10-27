import type { Metadata } from "next";
import Link from "next/link";
import { hotel } from "@/content/site";
import { contentPages, faq } from "@/content/pages";
import { Needed, PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { faqSchema, pageSchema } from "@/lib/schema";

const page = contentPages.faq;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/faq" },
  robots: page.draft ? { index: false, follow: true } : undefined,
};

export default function FaqPage() {
  const schema = faqSchema(faq);
  const answered = faq.filter((f) => f.a).length;

  return (
    <PageShell slug="faq">
      <JsonLd
        data={pageSchema("/faq", page.title, page.description, { extra: schema ? [schema] : [] })}
      />

      <p className="sub mt-4">
        The questions guests ask the front desk most often, with straight answers. Anything not
        here, call {hotel.phones[0]}.
      </p>

      {/*
        Each question is an h2 in the guest's own words. That is what a search engine, or someone
        asking an assistant, is matching against — far more than any keyword in the page title.
      */}
      <div className="mt-10 space-y-8">
        {faq.map(({ q, a }) => (
          <section key={q} className="border-t border-ivory/10 pt-6">
            <h2 className="text-lg font-semibold">{q}</h2>
            {a ? (
              <p className="mt-2 leading-relaxed text-ivory/75">{a}</p>
            ) : (
              <div className="mt-2">
                <Needed>Answer this one in a sentence or two.</Needed>
              </div>
            )}
          </section>
        ))}
      </div>

      <p className="mt-12 text-xs text-ivory/40">
        {answered} of {faq.length} answered. Unanswered questions are left out of the page&apos;s
        structured data rather than published empty.
      </p>

      <p className="mt-6 flex flex-wrap gap-3">
        <Link href="/book" className="btn-gold">Check availability</Link>
        <a href={`tel:${hotel.phones[0].replace(/\s/g, "")}`} className="btn-ghost">Call the front desk</a>
      </p>
    </PageShell>
  );
}
