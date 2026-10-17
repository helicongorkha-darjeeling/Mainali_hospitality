"use client";

/**
 * Lead capture: as soon as a visitor leaves a phone number, it lands in Supabase (`public.leads`)
 * so the front desk can call them, booked or not. Later steps update the same row.
 *
 * The site can only call the `capture_lead` function; it can't read any leads.
 * The URL and publishable key are public by design (they ship to every browser).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fbpxnrpjvskknzlyvceq.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_0dlfpCgqJiLbbg038WcS9w_UWw2DpcB";

export type LeadStage = "details" | "rooms" | "review" | "payment" | "booked";

export type Lead = {
  phone: string;
  name?: string;
  email?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: string;
  mealPlan?: string;
  total?: number;
  stage: LeadStage;
  bookingId?: string;
  upiRef?: string;
};

const ID_KEY = "teesta.lead.id";

/** One id per browser tab, so every step updates the same row. */
function leadId() {
  try {
    let id = sessionStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export const isPhone = (p: string) => {
  const d = p.replace(/\D/g, "").length;
  return d >= 10 && d <= 15;
};

let last = "";

/** Fire-and-forget. Never blocks or breaks the booking flow. */
export function captureLead(l: Lead) {
  if (!isPhone(l.phone)) return;
  const body = JSON.stringify({
    p_id: leadId(),
    p_phone: l.phone,
    p_name: l.name || null,
    p_email: l.email || null,
    p_check_in: l.checkIn || null,
    p_check_out: l.checkOut || null,
    p_guests: l.guests ?? null,
    p_rooms: l.rooms || null,
    p_meal_plan: l.mealPlan || null,
    p_total: l.total != null ? Math.round(l.total) : null,
    p_stage: l.stage,
    p_booking_id: l.bookingId || null,
    p_upi_ref: l.upiRef || null,
  });
  if (body === last) return; // nothing new
  last = body;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/capture_lead`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body,
    keepalive: true, // still sends if the page is closed or the UPI app opens
  }).catch(() => {});
}
