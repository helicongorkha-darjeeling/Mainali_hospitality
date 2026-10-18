import { roomInventory, rooms, type RoomSlug } from "@/content/site";
import {
  cancellationRules,
  convenienceFee,
  mealGstRate,
  mealPlans,
  roomGstTiers,
  roomRates,
  stayTimes,
  upi,
  type MealPlanCode,
} from "@/content/booking";

export type RoomQty = Record<RoomSlug, number>;
export const emptyQty = (): RoomQty => ({ king: 0, triple: 0, quad: 0, family: 0 });

/* ---------------------------------------------------------------- dates (local time, not UTC) */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (s: string, n: number) => {
  const d = fromISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
export const todayISO = () => toISODate(new Date());
export const nightsBetween = (a: string, b: string) =>
  Math.max(1, Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000));
export const formatDay = (s: string) =>
  fromISODate(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
export const formatWeekday = (s: string) => fromISODate(s).toLocaleDateString("en-IN", { weekday: "short" });
export const formatFull = (s: string) =>
  fromISODate(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/* ---------------------------------------------------------------- inventory + allocation */
export const inventory: RoomQty = roomInventory.reduce((acc, r) => {
  acc[r.type] += 1;
  return acc;
}, emptyQty());

const capacity = (slug: RoomSlug) => rooms.find((r) => r.slug === slug)!.maxGuests;
export const totalCapacity = (q: RoomQty) => (Object.keys(q) as RoomSlug[]).reduce((s, k) => s + q[k] * capacity(k), 0);
export const totalRooms = (q: RoomQty) => q.king + q.triple + q.quad + q.family;

/**
 * Picks rooms for a group: fewest rooms first, then the lowest price, then the fewest empty beds.
 * With a preferred type, it fills that type first (e.g. 3 guests who want The King get 2 Kings).
 */
export function allocateRooms(guests: number, prefer?: RoomSlug | ""): RoomQty {
  const g = Math.max(1, guests);
  if (prefer) {
    const n = Math.min(inventory[prefer], Math.ceil(g / capacity(prefer)));
    const q = { ...emptyQty(), [prefer]: n };
    const left = g - totalCapacity(q);
    if (left <= 0) return q;
    const rest = allocateRooms(left);
    return { king: q.king + rest.king, triple: q.triple + rest.triple, quad: q.quad + rest.quad, family: q.family + rest.family };
  }
  let best: { q: RoomQty; key: [number, number, number] } | null = null;
  for (let f = 0; f <= inventory.family; f++)
    for (let qd = 0; qd <= inventory.quad; qd++)
      for (let t = 0; t <= inventory.triple; t++)
        for (let k = 0; k <= inventory.king; k++) {
          const q = { king: k, triple: t, quad: qd, family: f };
          const cap = totalCapacity(q);
          if (cap < g) continue;
          const key: [number, number, number] = [totalRooms(q), roomNightPrice(q), cap - g];
          if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && (key[1] < best.key[1] || (key[1] === best.key[1] && key[2] < best.key[2]))))
            best = { q, key };
        }
  return best?.q ?? { ...emptyQty(), king: Math.ceil(g / 2) };
}

const roomNightPrice = (q: RoomQty) => (Object.keys(q) as RoomSlug[]).reduce((s, k) => s + q[k] * roomRates[k].direct, 0);

export const describeRooms = (q: RoomQty) =>
  rooms
    .filter((r) => q[r.slug] > 0)
    .map((r) => `${q[r.slug]} × ${r.name}`)
    .join(" + ");

/* ---------------------------------------------------------------- price */
export const roomGstRate = (tariff: number) => roomGstTiers.find((t) => tariff <= t.upTo)!.rate;
export const nightlyTaxes = (slug: RoomSlug) => Math.round(roomRates[slug].direct * roomGstRate(roomRates[slug].direct));
export const discountPct = (slug: RoomSlug) =>
  Math.round(((roomRates[slug].rack - roomRates[slug].direct) / roomRates[slug].rack) * 100);

export type Quote = {
  nights: number;
  rooms: number;
  rack: number;
  discount: number;
  roomsDirect: number;
  meals: number;
  mealPlan: (typeof mealPlans)[number];
  taxes: number;
  fee: number;
  total: number;
  savings: number;
};

export function quote(q: RoomQty, guests: number, nights: number, plan: MealPlanCode): Quote {
  const slugs = Object.keys(q) as RoomSlug[];
  const rack = slugs.reduce((s, k) => s + q[k] * roomRates[k].rack * nights, 0);
  const roomsDirect = slugs.reduce((s, k) => s + q[k] * roomRates[k].direct * nights, 0);
  const mealPlan = mealPlans.find((m) => m.code === plan) ?? mealPlans[0];
  const meals = mealPlan.perGuestNight * guests * nights;
  const roomTax = slugs.reduce((s, k) => s + q[k] * nights * roomRates[k].direct * roomGstRate(roomRates[k].direct), 0);
  const taxes = Math.round(roomTax + meals * mealGstRate);
  const fee = convenienceFee;
  return {
    nights,
    rooms: totalRooms(q),
    rack,
    discount: rack - roomsDirect,
    roomsDirect,
    meals,
    mealPlan,
    taxes,
    fee,
    total: roomsDirect + meals + taxes + fee,
    savings: rack - roomsDirect,
  };
}

/* ---------------------------------------------------------------- cancellation windows */
export type CancelWindow = { from: Date; to: Date; refundPct: number; passed: boolean; current: boolean };

/** Splits the time from now until check-in into refund windows (see cancellationRules). */
export function cancellationWindows(checkIn: string, now = new Date()): CancelWindow[] {
  const [h, m] = stayTimes.checkIn.split(":").map(Number);
  const arrival = fromISODate(checkIn);
  arrival.setHours(h, m, 0, 0);
  const H = 3_600_000;
  // e.g. [48h → 100%, 24h → 50%, 0h → 0%]: cancel before (arrival − 48h) for 100%, and so on.
  const rules = [...cancellationRules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  return rules.map((r, i) => {
    const from = i === 0 ? now : new Date(arrival.getTime() - rules[i - 1].hoursBefore * H);
    const to = new Date(arrival.getTime() - r.hoursBefore * H);
    return {
      from,
      to,
      refundPct: r.refundPct,
      passed: to.getTime() <= now.getTime(),
      current: from.getTime() <= now.getTime() && now.getTime() < to.getTime(),
    };
  });
}

/* ---------------------------------------------------------------- booking id + UPI */
export function newBookingId() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `TST-${ymd}-${Array.from(bytes, (b) => abc[b % abc.length]).join("")}`;
}

/** The UPI payment request (payee, amount, note) shared by every app link. */
const upiQuery = (amount: number, bookingId: string) =>
  [
    `pa=${encodeURIComponent(upi.vpa)}`,
    `pn=${encodeURIComponent(upi.payeeName)}`,
    `tr=${encodeURIComponent(upi.merchantRef)}`,
    `am=${amount.toFixed(2)}`,
    "cu=INR",
    `mc=${upi.merchantCode}`,
    `tn=${encodeURIComponent(`Hotel Teesta booking ${bookingId}`)}`,
  ].join("&");

/** Standard UPI link. On Android it opens the list of installed UPI apps. */
export const upiLink = (amount: number, bookingId: string) => `upi://pay?${upiQuery(amount, bookingId)}`;

export type Platform = "android" | "ios" | "desktop";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

/**
 * One-tap links that open a specific UPI app.
 * Android: an intent link with the app's package (opens the Play Store if the app isn't installed).
 * iPhone: the app's own URL scheme (iOS has no UPI app picker).
 */
export function upiAppLinks(amount: number, bookingId: string, platform: Platform) {
  const qs = upiQuery(amount, bookingId);
  const apps = [
    { id: "gpay", name: "Google Pay", android: "com.google.android.apps.nbu.paisa.user", ios: `tez://upi/pay?${qs}` },
    { id: "phonepe", name: "PhonePe", android: "com.phonepe.app", ios: `phonepe://pay?${qs}` },
    { id: "paytm", name: "Paytm", android: "net.one97.paytm", ios: `paytmmp://pay?${qs}` },
  ];
  return apps.map((a) => ({
    id: a.id,
    name: a.name,
    href: platform === "android" ? `intent://pay?${qs}#Intent;scheme=upi;package=${a.android};end` : a.ios,
  }));
}
