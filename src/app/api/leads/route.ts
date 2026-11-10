import { BOOKING_ID, fail, guestsOf, isoDate, planOf, qtyOf, readBody, sameOrigin, stayOf, text, tooMany } from "@/lib/api";
import { leadStoreStatus, saveLead } from "@/lib/lead-store";
import { describeRooms, quote } from "@/lib/pricing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAGES = ["details", "rooms", "review", "payment", "booked"];
const ROOM_NUMBERS = /^\d{3}(, \d{3}){0,24}$/;
/** What the desk reads after the rooms when the booking chart couldn't take the booking. */
const CHART_NOTES: Record<string, string> = {
  no_room: "NO ROOM IN CHART, call guest",
  not_updated: "CHART NOT UPDATED, call guest",
};

/**
 * POST /api/leads { id, phone, stage, name?, email?, checkIn?, checkOut?, guests?, rooms?, plan?, bookingId?, roomNumbers?, chart? }
 * Saves or updates the visitor's row in the front desk's leads list.
 *
 * The browser sends what the guest chose (rooms as { king: 2 }, the meal plan code); the wording and the
 * total the desk sees are produced here. The desk checks payments against that total, so it must not be
 * a number the guest's browser can set.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const b = await readBody(req);
  if (!b) return fail(400, "bad request");

  const phone = text(b.phone, 40);
  const digits = phone.replace(/\D/g, "").length;
  if (typeof b.id !== "string" || !UUID.test(b.id) || digits < 8 || digits > 15 || typeof b.stage !== "string" || !STAGES.includes(b.stage)) {
    return fail(400, "bad request");
  }
  if (tooMany("leads", req, 120)) return fail(429, "busy");

  const stay = stayOf(b.checkIn, b.checkOut);
  const qty = qtyOf(b.rooms);
  const guests = guestsOf(b.guests);
  const plan = planOf(b.plan);
  const roomNumbers = typeof b.roomNumbers === "string" && ROOM_NUMBERS.test(b.roomNumbers) ? b.roomNumbers : "";
  const chartNote = typeof b.chart === "string" ? CHART_NOTES[b.chart] : undefined;
  const rooms =
    qty && [describeRooms(qty), chartNote ?? (roomNumbers && `room${roomNumbers.includes(",") ? "s" : ""} ${roomNumbers}`)].filter(Boolean).join(" · ");

  const ok = await saveLead({
    p_id: b.id.toLowerCase(),
    p_phone: phone,
    p_name: text(b.name, 120) || null,
    p_email: text(b.email, 200) || null,
    p_check_in: isoDate(b.checkIn),
    p_check_out: isoDate(b.checkOut),
    p_guests: guests,
    p_rooms: rooms || null,
    p_meal_plan: plan,
    p_total: stay && qty && guests && plan ? quote(qty, guests, stay.nights, plan).total : null,
    p_stage: b.stage,
    p_booking_id: typeof b.bookingId === "string" && BOOKING_ID.test(b.bookingId) ? b.bookingId : null,
    p_upi_ref: null,
  });
  return ok ? Response.json({ ok: true }) : fail(502, "not saved");
}

/**
 * GET /api/leads → which keys the leads database accepts right now. Nothing is written.
 * Open it in a browser before and after running supabase/manual/lock_down_capture_lead.sql:
 * { serverKey: "working", publicKey: "open" } means it is safe to lock the public key out.
 * `ok` is false when neither key gets through, which means leads are not being saved.
 */
export async function GET(req: Request) {
  if (tooMany("leads-status", req, 20)) return fail(429, "busy");
  const s = await leadStoreStatus();
  return Response.json({ ok: s.serverKey === "working" || s.publicKey === "open", ...s }, { headers: { "Cache-Control": "no-store" } });
}
