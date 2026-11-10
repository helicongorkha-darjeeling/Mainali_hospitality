import { fail, stayOf, tooMany } from "@/lib/api";
import { chartAvailability } from "@/lib/chart";

/**
 * GET /api/availability?from=2026-10-25&to=2026-10-27 → rooms of each type free for the whole stay. Cached for a minute.
 * Dates the chart would refuse (too long, too far ahead, in the past) are turned away here, so they never cost a chart call.
 */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const stay = stayOf(p.get("from"), p.get("to"));
  if (!stay) return fail(400, "bad dates");
  if (tooMany("availability", req, 120)) return fail(429, "busy");

  const r = await chartAvailability(stay.checkIn, stay.checkOut);
  const cache = r.ok || r.reason === "not_configured" ? "public, s-maxage=60, stale-while-revalidate=60" : "no-store";
  return Response.json(r, { headers: { "Cache-Control": cache } });
}
