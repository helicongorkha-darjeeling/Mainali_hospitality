import type { Metadata } from "next";
import Link from "next/link";
import { hotel } from "@/content/site";
import { contentPages, gettingHereIntro, lastMile, pickupCosts, routes } from "@/content/pages";
import { Needed, PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema } from "@/lib/schema";

const page = contentPages["getting-here"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/getting-here" },
  robots: page.draft ? { index: false, follow: true } : undefined,
};

export default function GettingHerePage() {
  return (
    <PageShell slug="getting-here">
      <JsonLd data={pageSchema("/getting-here", page.title, page.description)} />

      {gettingHereIntro ? (
        <p className="sub mt-4">{gettingHereIntro}</p>
      ) : (
        <div className="mt-4">
          <Needed>
            One paragraph answering “how do I get to the hotel?”. Lead with the short version —
            most people arrive via Bagdogra or NJP and take a shared or private car up.
          </Needed>
        </div>
      )}

      <h2 className="mt-12 text-lg font-semibold">How far is the hotel from the airport and the station?</h2>
      <p className="mt-2 text-sm text-ivory/60">
        {hotel.name} is at {hotel.address}, about 50 seconds&apos; walk from the {hotel.city} bus stand.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ivory/15 text-xs uppercase tracking-[0.18em] text-ivory/55">
              <th scope="col" className="py-3 pr-4 font-medium">From</th>
              <th scope="col" className="py-3 pr-4 font-medium">Distance</th>
              <th scope="col" className="py-3 pr-4 font-medium">By car</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.from} className="border-b border-ivory/10">
                <th scope="row" className="py-3 pr-4 font-normal text-ivory">{r.from}</th>
                <td className="py-3 pr-4 text-ivory/80">{r.distance ?? <span className="text-ivory/35">— km</span>}</td>
                <td className="py-3 pr-4 text-ivory/80">{r.time ?? <span className="text-ivory/35">— hrs</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {routes.some((r) => !r.distance || !r.time) && (
        <div className="mt-4">
          <Needed>
            Real distances and journey times for each route, and what the hotel charges for a car.
            These are the numbers people search for, so they should be yours, not an estimate.
          </Needed>
        </div>
      )}

      <h2 className="mt-14 text-lg font-semibold">Can the hotel pick me up?</h2>
      <p className="mt-2 leading-relaxed text-ivory/75">{hotel.pickup}</p>
      {pickupCosts ? (
        <p className="mt-3 leading-relaxed text-ivory/75">{pickupCosts}</p>
      ) : (
        <div className="mt-3">
          <Needed>What a pickup costs from each place, and how far ahead to ask.</Needed>
        </div>
      )}

      <h2 className="mt-14 text-lg font-semibold">Finding the door</h2>
      {lastMile ? (
        <p className="mt-2 leading-relaxed text-ivory/75">{lastMile}</p>
      ) : (
        <div className="mt-2">
          <Needed>
            Walking directions from the bus stand, and a landmark to look for. Useful for guests
            arriving after dark.
          </Needed>
        </div>
      )}

      <h2 className="mt-14 text-lg font-semibold">On a map</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-ivory/10">
        <iframe
          title={`Map to ${hotel.name}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(hotel.mapQuery)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-72 w-full"
        />
      </div>

      <p className="mt-10 flex flex-wrap gap-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.mapQuery)}`}
          target="_blank"
          rel="noopener"
          className="btn-gold"
        >
          Get directions
        </a>
        <Link href="/faq" className="btn-ghost">More questions</Link>
      </p>
    </PageShell>
  );
}
