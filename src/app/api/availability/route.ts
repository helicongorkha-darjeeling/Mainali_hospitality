import { chartAvailability } from "@/lib/chart";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/availability?from=2026-10-25&to=2026-10-27 → rooms of each type free for the whole stay. Cached for a minute. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "";
  const to = p.get("to") ?? "";
  if (!ISO.test(from) || !ISO.test(to) || to <= from) return Response.json({ ok: false, reason: "bad dates" }, { status: 400 });

  const r = await chartAvailability(from, to);
  const cache = r.ok || r.reason === "not_configured" ? "public, s-maxage=60, stale-while-revalidate=60" : "no-store";
  return Response.json(r, { headers: { "Cache-Control": cache } });
}
