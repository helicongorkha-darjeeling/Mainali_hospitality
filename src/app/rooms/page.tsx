import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { hotel, rooms } from "@/content/site";
import { amenities, mealPlans, roomRates, stayTimes } from "@/content/booking";
import { contentPages, roomNotes, roomsIntro } from "@/content/pages";
import { Needed, PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema, roomListSchema } from "@/lib/schema";

const page = contentPages.rooms;
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/rooms" },
  // Draft pages stay out of the index until the copy is written.
  robots: page.draft ? { index: false, follow: true } : undefined,
};

export default function RoomsPage() {
  return (
    <PageShell slug="rooms">
      <JsonLd data={pageSchema("/rooms", page.title, page.description, { extra: [roomListSchema()] })} />

      {/* Answer-first: the question this page exists to answer, answered in the first paragraph. */}
      {roomsIntro ? (
        <p className="sub mt-4">{roomsIntro}</p>
      ) : (
        <div className="mt-4">
          <Needed>
            One short paragraph answering “what are the rooms like?”. Two or three sentences, the
            kind of thing you would say to a guest at the desk.
          </Needed>
        </div>
      )}

      <h2 className="mt-12 text-lg font-semibold">Which room sleeps how many, and what does it cost?</h2>
      <p className="mt-2 text-sm text-ivory/60">
        Direct rates, per room per night. Taxes are shown before you pay, and there is no booking fee.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ivory/15 text-xs uppercase tracking-[0.18em] text-ivory/55">
              <th scope="col" className="py-3 pr-4 font-medium">Room</th>
              <th scope="col" className="py-3 pr-4 font-medium">Beds</th>
              <th scope="col" className="py-3 pr-4 font-medium">Sleeps</th>
              <th scope="col" className="py-3 pr-4 font-medium">Rate / night</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.slug} className="border-b border-ivory/10">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <Link href={`/rooms/${r.slug}`} className="link-gold">{r.name}</Link>
                  <span className="block text-xs text-ivory/50">{r.occupancy}</span>
                </th>
                <td className="py-3 pr-4 text-ivory/80">{r.beds}</td>
                <td className="py-3 pr-4 text-ivory/80">{r.maxGuests}</td>
                <td className="py-3 pr-4 text-ivory/80">{inr(roomRates[r.slug].direct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-14 text-lg font-semibold">The rooms</h2>
      <div className="mt-5 space-y-10">
        {rooms.map((r) => (
          <section key={r.slug} className="border-t border-ivory/10 pt-6">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl sm:w-56">
                <Image src={r.image} alt={r.imageAlt} fill sizes="(min-width: 640px) 224px, 100vw" className="object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-3xl leading-none">
                  <Link href={`/rooms/${r.slug}`} className="hover:text-gold-bright">{r.name}</Link>
                </h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ivory/60">{r.occupancy}</p>
                <p className="mt-3 text-sm text-ivory/75">
                  Sleeps up to {r.maxGuests} in {r.beds} {r.beds === 1 ? "bed" : "beds"}, from{" "}
                  {inr(roomRates[r.slug].direct)} a night.
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {r.features.map((f) => (
                    <li key={f} className="exp-chip">{f}</li>
                  ))}
                </ul>
                {roomNotes[r.slug] ? (
                  <p className="mt-3 text-sm text-ivory/75">{roomNotes[r.slug]}</p>
                ) : (
                  <div className="mt-3">
                    <Needed>A line of your own about {r.name}.</Needed>
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      <h2 className="mt-14 text-lg font-semibold">What comes with every room?</h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {amenities.map((g) => (
          <div key={g.group}>
            <h3 className="text-xs uppercase tracking-[0.2em] text-gold">{g.group}</h3>
            <ul className="mt-2 space-y-1 text-sm text-ivory/70">
              {g.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-lg font-semibold">Can I add meals?</h2>
      <p className="mt-2 text-sm text-ivory/75">
        Yes. Meal plans are charged per guest, per night, on top of the room rate.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ivory/75">
        {mealPlans.map((m) => (
          <li key={m.code} className="border-t border-ivory/10 pt-2">
            <b className="text-ivory">{m.code}</b> · {m.name} —{" "}
            {m.perGuestNight ? `${inr(m.perGuestNight)} per guest per night` : "included in the room rate"}
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-ivory/60">
        Check-in from {stayTimes.checkInLabel}, check-out by {stayTimes.checkOutLabel}. All rooms are
        at {hotel.address}.
      </p>
      <p className="mt-6">
        <Link href="/book" className="btn-gold">Check availability</Link>
      </p>
    </PageShell>
  );
}
