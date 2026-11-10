/**
 * The hotel's booking chart (a Google Sheet) is the master for rooms. This talks to the Apps Script web app inside it
 * (google/room-chart.gs). Server only: CHART_API_SECRET never reaches the browser.
 * Without CHART_API_URL and CHART_API_SECRET the site books as before, with no live availability.
 */
import { rooms, type RoomSlug } from "@/content/site";
import type { RoomQty } from "@/lib/pricing";

export type ChartReply =
  | { ok: true; free?: RoomQty; assigned?: Partial<Record<RoomSlug, number[]>> }
  | { ok: false; reason: string; type?: RoomSlug; left?: number; free?: RoomQty };

type Booking = { bookingId: string; checkIn: string; checkOut: string; rooms: RoomQty; label: string };

const REASONS = ["sold_out", "busy", "limit", "forbidden", "bad request", "bad dates", "dates not in chart", "unknown action", "error"];
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/**
 * Only the fields the site knows, with the types it expects. The script's reply goes on to the guest's
 * browser, so anything else it says (an error message, say) stops here.
 */
function clean(raw: unknown): ChartReply {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "unreachable" };
  const r = raw as Record<string, unknown>;
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
  const freeIn = obj(r.free);
  const free = freeIn ? (Object.fromEntries(rooms.map((x) => [x.slug, count(freeIn[x.slug])])) as RoomQty) : undefined;

  if (r.ok === true) {
    const a = obj(r.assigned);
    const assigned = a
      ? Object.fromEntries(rooms.flatMap((x) => (Array.isArray(a[x.slug]) ? [[x.slug, (a[x.slug] as unknown[]).map(count)]] : [])))
      : undefined;
    return { ok: true, ...(free && { free }), ...(assigned && { assigned }) };
  }
  const reason = typeof r.reason === "string" && REASONS.includes(r.reason) ? r.reason : "error";
  const type = rooms.find((x) => x.slug === r.type)?.slug;
  return { ok: false, reason, ...(type && { type }), ...(typeof r.left === "number" && { left: count(r.left) }), ...(free && { free }) };
}

async function call(body: object, timeoutMs: number): Promise<ChartReply> {
  const url = process.env.CHART_API_URL;
  const secret = process.env.CHART_API_SECRET;
  if (!url || !secret) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, secret }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return clean(await res.json());
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/** Rooms of each type free on every night of the stay. */
export const chartAvailability = (checkIn: string, checkOut: string) => call({ action: "availability", checkIn, checkOut }, 10_000);

/** hold: amber cells for 30 minutes while the guest pays. confirm: green "VERIFY PAY" cells. Returns the room numbers. */
export const chartBooking = (action: "hold" | "confirm", b: Booking) => call({ action, ...b }, 15_000);
