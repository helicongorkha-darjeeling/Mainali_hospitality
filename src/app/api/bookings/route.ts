import { rooms } from "@/content/site";
import { chartAvailability, chartBooking } from "@/lib/chart";
import { emptyQty, inventory } from "@/lib/pricing";

const ID = /^TST-\d{6}-[A-Z0-9]{4}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PLANS = ["EP", "CP", "MAP", "AP"];

// Best effort, per server instance: stops one visitor from holding every room again and again.
const recent = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 12;
}

/**
 * POST /api/bookings { action: "hold" | "confirm", bookingId, checkIn, checkOut, rooms, name, guests, plan, phone }
 * hold: when the guest reaches payment, the rooms are held in the booking chart for 30 minutes.
 * confirm: when they say they've paid, the hold becomes a booking for the desk to verify.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || (b.action !== "hold" && b.action !== "confirm")) return Response.json({ ok: false, reason: "bad request" }, { status: 400 });

  const qty = emptyQty();
  for (const r of rooms) qty[r.slug] = Math.floor(Number(b.rooms?.[r.slug]) || 0);
  const valid =
    ID.test(b.bookingId) &&
    ISO.test(b.checkIn) &&
    ISO.test(b.checkOut) &&
    b.checkOut > b.checkIn &&
    rooms.every((r) => qty[r.slug] >= 0 && qty[r.slug] <= inventory[r.slug]) &&
    rooms.some((r) => qty[r.slug] > 0);
  if (!valid) return Response.json({ ok: false, reason: "bad request" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (tooMany(ip)) return Response.json({ ok: false, reason: "busy" }, { status: 429 });

  // what the desk reads in the chart cell: "Mr. Helicon Gorkha · 2 pax · CP · +919800000000"
  const label = [
    String(b.name ?? "").replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60),
    `${Math.min(20, Math.max(1, Math.floor(Number(b.guests)) || 1))} pax`,
    PLANS.includes(b.plan) ? b.plan : "",
    String(b.phone ?? "").replace(/[^\d+]/g, "").slice(0, 16),
  ]
    .filter(Boolean)
    .join(" · ");

  const r = await chartBooking(b.action, { bookingId: b.bookingId, checkIn: b.checkIn, checkOut: b.checkOut, rooms: qty, label });
  if (!r.ok && r.reason === "sold_out") {
    // send back what's left so the guest can pick again straight away
    const a = await chartAvailability(b.checkIn, b.checkOut);
    if (a.ok) return Response.json({ ...r, free: a.free });
  }
  return Response.json(r);
}
