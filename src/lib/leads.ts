"use client";

/**
 * Lead capture: as soon as a visitor leaves a phone number, it goes to the front desk's leads list
 * so they can call, booked or not. Later steps update the same row.
 *
 * The browser sends what the guest chose to /api/leads. The server checks it, works out the total
 * and writes the row; the browser never talks to the database and can't read any leads.
 */
import type { MealPlanCode } from "@/content/booking";
import type { RoomQty } from "@/lib/pricing";

export type LeadStage = "details" | "rooms" | "review" | "payment" | "booked";

export type Lead = {
  phone: string;
  name?: string;
  email?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: RoomQty;
  plan?: MealPlanCode;
  stage: LeadStage;
  bookingId?: string;
  /** Room numbers the booking chart gave this booking, e.g. "301, 302". */
  roomNumbers?: string;
  /** Set when the guest says they've paid but the chart couldn't take the booking: the desk must call. */
  chart?: "no_room" | "not_updated";
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
  const body = JSON.stringify({ id: leadId(), ...l });
  if (body === last) return; // nothing new
  last = body;
  fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true, // still sends if the page is closed or the UPI app opens
  }).catch(() => {});
}
