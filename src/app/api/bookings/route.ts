import { BOOKING_ID, fail, guestsOf, planOf, qtyOf, readBody, sameOrigin, stayOf, text, tooMany } from "@/lib/api";
import { chartAvailability, chartBooking } from "@/lib/chart";
import { inr, quote, totalCapacity, totalRooms } from "@/lib/pricing";

/**
 * POST /api/bookings { action: "hold" | "confirm", bookingId, checkIn, checkOut, rooms, name, guests, plan, phone }
 * hold: when the guest reaches payment, the rooms are held in the booking chart for 30 minutes.
 * confirm: when they say they've paid, the hold becomes a booking for the desk to verify.
 *
 * Anyone can call this, so it only accepts what the booking page itself allows: a stay of up to 30 nights,
 * no more rooms than guests, and enough beds for everyone. The price in the chart cell is worked out here,
 * not taken from the browser, so the desk can check a payment against it.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const b = await readBody(req);
  if (!b || (b.action !== "hold" && b.action !== "confirm")) return fail(400, "bad request");

  const bookingId = typeof b.bookingId === "string" && BOOKING_ID.test(b.bookingId) ? b.bookingId : null;
  const stay = stayOf(b.checkIn, b.checkOut);
  const qty = qtyOf(b.rooms);
  const guests = guestsOf(b.guests);
  const plan = planOf(b.plan);
  if (!bookingId || !stay || !qty || !guests || !plan) return fail(400, "bad request");
  if (totalRooms(qty) > guests || totalCapacity(qty) < guests) return fail(400, "bad request");

  if (tooMany("bookings", req, 12)) return fail(429, "busy");

  // what the desk reads in the chart cell: "Mr. Helicon Gorkha · 2 pax · CP · +919800000000 · ₹4,123"
  const label = [
    text(b.name, 200).replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60),
    `${guests} pax`,
    plan,
    text(b.phone, 40).replace(/[^\d+]/g, "").slice(0, 16),
    inr(quote(qty, guests, stay.nights, plan).total),
  ]
    .filter(Boolean)
    .join(" · ");

  const r = await chartBooking(b.action, { bookingId, checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: qty, label });
  if (!r.ok && r.reason === "sold_out") {
    // send back what's left so the guest can pick again straight away
    const a = await chartAvailability(stay.checkIn, stay.checkOut);
    if (a.ok) return Response.json({ ...r, free: a.free });
  }
  return Response.json(r);
}
