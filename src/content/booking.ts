/**
 * Booking flow settings: prices, meal plans, taxes, amenities, stay times, cancellation and payment.
 * Everything marked TODO(client) must be confirmed by the hotel before taking real payments.
 * Phase 2: move to Supabase (`rooms.price_*`, `settings`).
 */
import type { RoomSlug } from "./site";

/** Per room, per night, in ₹. `rack` is the published rate; `direct` is the website price. */
export const roomRates: Record<RoomSlug, { rack: number; direct: number }> = {
  king: { rack: 4399, direct: 1868 },
  triple: { rack: 5499, direct: 2468 }, // TODO(client): confirm
  quad: { rack: 6599, direct: 2968 }, // TODO(client): confirm
  family: { rack: 9999, direct: 4468 }, // TODO(client): confirm
};

export type MealPlanCode = "EP" | "CP" | "MAP" | "AP";

/** Added per guest, per night. */
export const mealPlans: { code: MealPlanCode; name: string; detail: string; perGuestNight: number }[] = [
  { code: "EP", name: "Room only", detail: "No meals included", perGuestNight: 0 },
  { code: "CP", name: "Breakfast included", detail: "Breakfast every morning", perGuestNight: 250 },
  { code: "MAP", name: "Breakfast + lunch or dinner", detail: "Two meals a day", perGuestNight: 500 },
  { code: "AP", name: "All meals", detail: "Breakfast, lunch and dinner", perGuestNight: 750 },
];

/**
 * GST on hotel rooms, by the room tariff per night (India, from 22 Sep 2025).
 * TODO(client): confirm with the hotel's accountant.
 */
export const roomGstTiers = [
  { upTo: 1000, rate: 0 },
  { upTo: 7500, rate: 0.05 },
  { upTo: Infinity, rate: 0.18 },
];
export const mealGstRate = 0.05; // TODO(client): confirm
export const convenienceFee = 0; // booking direct: no convenience fee

/** TODO(client): confirm (taken from the hotel's OTA listing). */
export const stayTimes = { checkIn: "12:00", checkOut: "11:00", checkInLabel: "12 PM", checkOutLabel: "11 AM" };

/**
 * Cancellation schedule, hours before check-in time. Refunds go back to the paying UPI account.
 * TODO(client): DRAFT. The hotel must approve this before taking real payments.
 */
export const cancellationRules = [
  { hoursBefore: 48, refundPct: 100 },
  { hoursBefore: 24, refundPct: 50 },
  { hoursBefore: 0, refundPct: 0 },
];

/**
 * UPI payment. Guests scan the QR or open their UPI app; the hotel verifies the UPI reference (UTR).
 * TODO(client): switch to the hotel's merchant UPI ID (or a payment gateway) before launch.
 * Personal UPI IDs have daily limits and some apps block web payment links to them.
 */
export const upi = { vpa: "upeshb92-4@oksbi", payeeName: "Hotel Teesta" };

/** Room amenities shown in the booking flow. */
export const amenities: { group: string; items: string[] }[] = [
  {
    group: "Essentials",
    items: ["WiFi", "TV", "Air conditioning", "Toiletries", "Towels", "Water bottle", "Private bathroom"],
  },
  {
    group: "Popular with guests",
    items: ["Warm blanket", "Attached washroom", "Laundry", "Fan", "Shower", "Accessible by elevator", "Room service"],
  },
  {
    group: "Room features",
    items: ["Blackout curtains", "Wardrobe", "Housekeeping", "Mirror", "Charging points", "Hangers", "Trash can", "Socket near the bed"],
  },
  { group: "Bathroom", items: ["Bathtub or shower", "Geyser", "Hot water", "Body soap", "Toilet paper", "Dustbin"] },
  { group: "Bedding", items: ["Cushions", "Warm blanket"] },
];

/** Highlights shown as chips on each room card. */
export const roomHighlights = ["WiFi", "Hot water", "Warm blanket", "Room service", "Attached washroom"];

export const frontDeskPerk = {
  title: "Your Darjeeling, planned at the front desk",
  body: "Our own travel guide and car fleet take in-house guests to the trending spots, for less than outside travel agencies.",
};
