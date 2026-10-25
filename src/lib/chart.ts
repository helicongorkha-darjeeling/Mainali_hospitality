/**
 * The hotel's booking chart (a Google Sheet) is the master for rooms. This talks to the Apps Script web app inside it
 * (google/room-chart.gs). Server only: CHART_API_SECRET never reaches the browser.
 * Without CHART_API_URL and CHART_API_SECRET the site books as before, with no live availability.
 */
import type { RoomSlug } from "@/content/site";
import type { RoomQty } from "@/lib/pricing";

export type ChartReply =
  | { ok: true; free?: RoomQty; assigned?: Partial<Record<RoomSlug, number[]>> }
  | { ok: false; reason: string; type?: RoomSlug; left?: number; free?: RoomQty };

type Booking = { bookingId: string; checkIn: string; checkOut: string; rooms: RoomQty; label: string };

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
    return (await res.json()) as ChartReply;
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/** Rooms of each type free on every night of the stay. */
export const chartAvailability = (checkIn: string, checkOut: string) => call({ action: "availability", checkIn, checkOut }, 10_000);

/** hold: amber cells for 30 minutes while the guest pays. confirm: green "VERIFY PAY" cells. Returns the room numbers. */
export const chartBooking = (action: "hold" | "confirm", b: Booking) => call({ action, ...b }, 15_000);
