import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hotel, rooms, type RoomSlug } from "@/content/site";
import { amenities, mealPlans, roomRates, stayTimes } from "@/content/booking";
import { contentPages, roomNotes } from "@/content/pages";
import { Needed, PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema, roomSchema } from "@/lib/schema";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const find = (slug: string) => rooms.find((r) => r.slug === slug);

export function generateStaticParams() {
  return rooms.map((r) => ({ slug: r.slug }));
}

const describe = (slug: RoomSlug) => {
  const r = find(slug)!;
  return `${r.name} at ${hotel.name}, ${hotel.city}: ${r.occupancy.toLowerCase()}, sleeps up to ${r.maxGuests}, from ${inr(roomRates[slug].direct)} a night.`;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = find(slug);
  if (!r) return {};
  return {
    title: r.name,
    description: describe(r.slug),
    alternates: { canonical: `/rooms/${slug}` },
    robots: contentPages.rooms.draft ? { index: false, follow: true } : undefined,
    openGraph: { images: [{ url: r.image, alt: r.imageAlt }] },
  };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = find(slug);
  if (!r) notFound();

  const rate = roomRates[r.slug];
  const saving = Math.round(((rate.rack - rate.direct) / rate.rack) * 100);

  return (
    <PageShell slug="rooms">
      <JsonLd
        data={pageSchema(`/rooms/${r.slug}`, r.name, describe(r.slug), { extra: [roomSchema(r)] })}
      />

      <p className="mt-6">
        <Link href="/rooms" className="text-sm text-gold-bright">← All rooms</Link>
      </p>

      <h2 className="mt-4 font-display text-4xl leading-none">{r.name}</h2>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ivory/60">{r.occupancy}</p>

      {/* Answer-first: the facts a guest is actually checking, in the first lines. */}
      <p className="sub mt-4">
        {r.name} sleeps up to {r.maxGuests} {r.maxGuests === 1 ? "guest" : "guests"} in {r.beds}{" "}
        {r.beds === 1 ? "bed" : "beds"}, from {inr(rate.direct)} per room per night booked direct
        {saving > 0 ? ` — ${saving}% below the ${inr(rate.rack)} rack rate` : ""}. Check-in from{" "}
        {stayTimes.checkInLabel}, check-out by {stayTimes.checkOutLabel}.
      </p>

      {roomNotes[r.slug] ? (
        <p className="mt-4 text-sm text-ivory/75">{roomNotes[r.slug]}</p>
      ) : (
        <div className="mt-4">
          <Needed>A paragraph about {r.name} — who it suits, what the room feels like.</Needed>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[r.image, ...r.images].map((src, i) => (
          <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src={src}
              alt={i === 0 ? r.imageAlt : `${r.name} at ${hotel.name}, ${hotel.city}`}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <h3 className="mt-12 text-lg font-semibold">What&apos;s in this room?</h3>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {r.features.map((f) => (
          <li key={f} className="exp-chip">{f}</li>
        ))}
      </ul>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {amenities.map((g) => (
          <div key={g.group}>
            <h4 className="text-xs uppercase tracking-[0.2em] text-gold">{g.group}</h4>
            <ul className="mt-2 space-y-1 text-sm text-ivory/70">
              {g.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="mt-12 text-lg font-semibold">What does it cost with meals?</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ivory/15 text-xs uppercase tracking-[0.18em] text-ivory/55">
              <th scope="col" className="py-3 pr-4 font-medium">Meal plan</th>
              <th scope="col" className="py-3 pr-4 font-medium">Added per guest / night</th>
            </tr>
          </thead>
          <tbody>
            {mealPlans.map((m) => (
              <tr key={m.code} className="border-b border-ivory/10">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <b className="text-ivory">{m.code}</b> · {m.name}
                </th>
                <td className="py-3 pr-4 text-ivory/80">
                  {m.perGuestNight ? inr(m.perGuestNight) : "Included"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-10">
        <Link href={`/book?room=${r.slug}`} className="btn-gold">Check availability</Link>
      </p>
    </PageShell>
  );
}
