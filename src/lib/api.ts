/**
 * Checks shared by the API routes (/api/bookings, /api/availability, /api/leads). Server only.
 * Nothing a browser sends is trusted: every field is checked for type and range here, and prices are
 * worked out again on the server.
 */
import { rooms } from "@/content/site";
import { bookingLimits, mealPlans, type MealPlanCode } from "@/content/booking";
import { emptyQty, inventory, totalRooms, type RoomQty } from "@/lib/pricing";
import { siteUrl } from "@/lib/seo";

export const BOOKING_ID = /^TST-\d{6}-[A-Z0-9]{4}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

export const fail = (status: number, reason: string) => Response.json({ ok: false, reason }, { status });

/** The request body as a plain object, or null. */
export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const b: unknown = await req.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
}

/**
 * False when a browser sends the request from another website. Browsers always add Origin to a
 * cross-site POST, so this stops other sites from using their visitors to call the API.
 * A request with no Origin (not a browser) is left to the other checks.
 */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return [req.headers.get("host"), req.headers.get("x-forwarded-host"), new URL(siteUrl).host].includes(host);
  } catch {
    return false;
  }
}

/**
 * Best effort, per server instance: slows one address down. On Vercel the platform sets
 * x-forwarded-for itself, so a visitor can't fake it. The hard limits live elsewhere
 * (the chart script's daily cap, the database's cap on new leads).
 */
const hits = new Map<string, number[]>();
export function tooMany(route: string, req: Request, max: number, windowMs = 10 * 60_000) {
  const now = Date.now();
  const key = `${route}:${req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length <= max) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] >= windowMs) hits.delete(k);
  return recent.length > max;
}

/** A real calendar date as "2026-10-25", or null ("2026-02-31" and non-strings are refused). */
export function isoDate(v: unknown): string | null {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v ? v : null;
}

export type Stay = { checkIn: string; checkOut: string; nights: number };

/**
 * A stay that can be booked online: 1 to 30 nights, not in the past, not too far ahead.
 * A day of slack either side, because the guest's "today" depends on their time zone.
 */
export function stayOf(from: unknown, to: unknown): Stay | null {
  const checkIn = isoDate(from);
  const checkOut = isoDate(to);
  if (!checkIn || !checkOut) return null;
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const nights = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - a) / DAY);
  const today = Math.floor(Date.now() / DAY) * DAY;
  if (nights < 1 || nights > bookingLimits.maxNights) return null;
  if (a < today - DAY || a > today + (bookingLimits.maxDaysAhead + 1) * DAY) return null;
  return { checkIn, checkOut, nights };
}

/** { king: 2, quad: 1 } with whole numbers within the hotel's inventory and at least one room, or null. */
export function qtyOf(v: unknown): RoomQty | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const q = emptyQty();
  for (const r of rooms) {
    const n = (v as Record<string, unknown>)[r.slug] ?? 0;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > inventory[r.slug]) return null;
    q[r.slug] = n;
  }
  return totalRooms(q) > 0 ? q : null;
}

/** A whole number of guests between 1 and the online limit, or null. */
export const guestsOf = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= bookingLimits.maxGuests ? v : null;

export const planOf = (v: unknown): MealPlanCode | null => mealPlans.find((m) => m.code === v)?.code ?? null;

/** Trimmed text, cut to `max`. Anything that isn't a string becomes "". */
export const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
