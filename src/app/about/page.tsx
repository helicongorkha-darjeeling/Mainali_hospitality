import type { Metadata } from "next";
import Link from "next/link";
import { hotel, rooms } from "@/content/site";
import { frontDeskPerk, stayTimes } from "@/content/booking";
import { about, contentPages } from "@/content/pages";
import { Needed, PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema } from "@/lib/schema";

const page = contentPages.about;

export const metadata: Metadata = {
  // `absolute` because the title already names the hotel; the layout template would repeat it.
  title: { absolute: `${page.title} · ${hotel.city}` },
  description: page.description,
  alternates: { canonical: "/about" },
  robots: page.draft ? { index: false, follow: true } : undefined,
};

/** The facts an answer engine looks for when deciding whether a business is real and relevant. */
const facts: [string, string][] = [
  ["Hotel", hotel.name],
  ["Run by", hotel.brand],
  ["Address", hotel.address],
  ["Rooms", `25 rooms across ${rooms.length} types`],
  ["Check-in / out", `${stayTimes.checkInLabel} / ${stayTimes.checkOutLabel}`],
  ["Phone", hotel.phones.join(", ")],
  ["Email", hotel.email],
];

export default function AboutPage() {
  return (
    <PageShell slug="about">
      <JsonLd data={pageSchema("/about", page.title, page.description, { type: "AboutPage" })} />

      <p className="sub mt-4">
        {hotel.name} is a hotel in central {hotel.city}, run by {hotel.brand}, about 50 seconds&apos;
        walk from the {hotel.city} bus stand.
      </p>

      <h2 className="mt-12 text-lg font-semibold">The facts</h2>
      <dl className="mt-4 divide-y divide-ivory/10 border-y border-ivory/10 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
            <dt className="shrink-0 text-xs uppercase tracking-[0.18em] text-ivory/50 sm:w-40">{k}</dt>
            <dd className="text-ivory/85">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 space-y-8">
        {about.map(({ heading, body }) => (
          <section key={heading} className="border-t border-ivory/10 pt-6">
            <h2 className="text-lg font-semibold">{heading}</h2>
            {body ? (
              <p className="mt-2 leading-relaxed text-ivory/75">{body}</p>
            ) : (
              <div className="mt-2">
                <Needed>A paragraph in your own words.</Needed>
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="mt-12 border-t border-ivory/10 pt-6">
        <h2 className="text-lg font-semibold">{frontDeskPerk.title}</h2>
        <p className="mt-2 leading-relaxed text-ivory/75">{frontDeskPerk.body}</p>
        <p className="mt-2 text-sm text-ivory/60">{hotel.pickup}</p>
      </section>

      <p className="mt-12 flex flex-wrap gap-3">
        <Link href="/rooms" className="btn-gold">See the rooms</Link>
        <Link href="/getting-here" className="btn-ghost">Getting here</Link>
      </p>
    </PageShell>
  );
}
