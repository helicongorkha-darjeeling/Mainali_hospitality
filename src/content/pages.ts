/**
 * Content for the standalone pages (/rooms, /faq, /getting-here, /about).
 *
 * `draft: true` means the page still has copy to write. A draft page is `noindex` and stays out of
 * sitemap.xml, so Google never sees a half-finished page — thin content hurts more than a missing
 * page does. Write the copy, flip the flag, done.
 *
 * Anything written as `null` is a placeholder: the page shows a visible "copy needed" box in its
 * place, and it is left out of the structured data rather than published empty.
 */
import { hotel, rooms } from "./site";
import { amenities, cancellationRules, mealPlans, stayTimes } from "./booking";

export type PageSlug = "rooms" | "faq" | "getting-here" | "about";

export const contentPages: Record<PageSlug, { title: string; nav: string; description: string; draft: boolean }> = {
  rooms: {
    title: "Rooms and rates",
    nav: "Rooms",
    description: `The four room types at ${hotel.name}, ${hotel.city}: beds, how many guests each sleeps, and the direct nightly rate.`,
    // Built almost entirely from real data; only the intro paragraph is still to write.
    draft: true,
  },
  faq: {
    title: "Questions guests ask",
    nav: "FAQ",
    description: `Check-in times, meal plans, pickup, payment and cancellation at ${hotel.name}, ${hotel.city}.`,
    draft: true,
  },
  "getting-here": {
    title: "Getting here",
    nav: "Getting here",
    description: `How to reach ${hotel.name} from Bagdogra Airport, New Jalpaiguri station, Siliguri and Gangtok.`,
    draft: true,
  },
  about: {
    title: `About ${hotel.name}`,
    nav: "About",
    description: `${hotel.name} is run by ${hotel.brand} in central ${hotel.city}, a minute from the bus stand.`,
    draft: true,
  },
};

export const pageOrder: PageSlug[] = ["rooms", "faq", "getting-here", "about"];

/** Marks copy that still has to be written. TODO(client). */
export type Copy = string | null;

/* ------------------------------------------------------------------ /rooms */

/** One short paragraph answering "what are the rooms like?" before the table. */
export const roomsIntro: Copy = null;

/** A line of your own for each room type, under its specs. */
export const roomNotes: Record<string, Copy> = Object.fromEntries(rooms.map((r) => [r.slug, null]));

/* ------------------------------------------------------------------ /faq */

const refundSchedule = [...cancellationRules]
  .sort((a, b) => b.hoursBefore - a.hoursBefore)
  .map((r) => (r.hoursBefore === 0 ? `under ${cancellationRules[1].hoursBefore} hours, no refund` : `${r.hoursBefore}+ hours before check-in, ${r.refundPct}%`))
  .join("; ");

const has = (item: string) => amenities.some((g) => g.items.includes(item));

/**
 * Answers written as `null` need yours. The rest are generated from the booking data, so they
 * cannot contradict the booking flow — and if a rate or a time changes, they change with it.
 */
export const faq: { q: string; a: Copy }[] = [
  {
    q: "What time is check-in and check-out?",
    a: `Check-in is from ${stayTimes.checkInLabel} and check-out is by ${stayTimes.checkOutLabel}. Early check-in and late check-out depend on availability and may be charged.`,
  },
  {
    q: "Where exactly is the hotel?",
    a: `${hotel.name} is at ${hotel.address} — about 50 seconds' walk from the ${hotel.city} bus stand.`,
  },
  {
    q: "What meal plans can I choose?",
    a: `${mealPlans
      .map((m) => `${m.code} (${m.name.toLowerCase()})${m.perGuestNight ? ` at ₹${m.perGuestNight} per guest per night` : " is included in the room rate"}`)
      .join(", ")}.`,
  },
  {
    q: "How many guests can a room sleep?",
    a: `${rooms.map((r) => `${r.name} sleeps up to ${r.maxGuests}`).join(", ")}. For a larger group, book more than one room or ask the front desk.`,
  },
  {
    q: "Do you arrange airport or station pickup?",
    a: hotel.pickup + " Ask the front desk when you book, or call ahead.",
  },
  {
    q: "How do I pay, and when?",
    a: "You pay in full by UPI when you book on this website. Your booking is confirmed once the hotel has matched the payment to your booking ID and confirmed it by WhatsApp or email.",
  },
  {
    q: "What is your cancellation policy?",
    a: `Refunds depend on when you cancel: ${refundSchedule}. Refunds go back to the UPI account that paid.`,
  },
  {
    q: "What ID do I need at check-in?",
    a: "Every adult guest must show a valid government photo ID. Foreign nationals must show a passport and valid visa, which the hotel registers as Indian law requires.",
  },
  ...(has("Hot water") || has("Geyser")
    ? [{ q: "Is there hot water?", a: "Yes. Every room has an attached bathroom with a geyser and hot water." as Copy }]
    : []),
  ...(has("WiFi") ? [{ q: "Is WiFi included?", a: "Yes, WiFi is included in every room at no extra charge." as Copy }] : []),
  ...(has("Accessible by elevator") ? [{ q: "Is there a lift?", a: "Yes, the rooms are reachable by elevator." as Copy }] : []),
  { q: "Is there a restaurant?", a: "Yes. Teesta Restaurant is downstairs, and room service is available." },
  // TODO(client): these need real answers before the page goes live.
  { q: "Is there parking?", a: null },
  { q: "Are pets allowed?", a: null },
  { q: "Do you have rooms with a mountain view?", a: null },
];

/* ------------------------------------------------------------------ /getting-here */

/** TODO(client): real distance and journey time for each route, plus what a car costs. */
export const routes: { from: string; distance: Copy; time: Copy; note: Copy }[] = [
  { from: "Bagdogra Airport (IXB)", distance: null, time: null, note: null },
  { from: "New Jalpaiguri station (NJP)", distance: null, time: null, note: null },
  { from: "Siliguri", distance: null, time: null, note: null },
  { from: "Gangtok", distance: null, time: null, note: null },
];

/** One paragraph answering "how do I get to the hotel?" before the table. */
export const gettingHereIntro: Copy = null;

/** What the hotel charges to collect a guest, and how far ahead to ask. */
export const pickupCosts: Copy = null;

/** How to find the door once you are at the bus stand. */
export const lastMile: Copy = null;

/* ------------------------------------------------------------------ /about */

export const about: { heading: string; body: Copy }[] = [
  { heading: `Who runs ${hotel.name}?`, body: null },
  { heading: "What kind of stay is it?", body: null },
  { heading: "What does the front desk do for guests?", body: null },
];
