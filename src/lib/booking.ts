import { hotel, rooms } from "@/content/site";

export type BookingRequest = {
  checkIn: string;
  checkOut: string;
  guests: number;
  room: string; // room slug, or "" for any
  name: string;
  phone: string;
};

function bookingLines(b: BookingRequest) {
  const roomName = rooms.find((r) => r.slug === b.room)?.name ?? "Any room";
  return [
    `Check-in: ${b.checkIn || "-"}`,
    `Check-out: ${b.checkOut || "-"}`,
    `Guests: ${b.guests}`,
    `Room: ${roomName}`,
    b.name && `Name: ${b.name}`,
    b.phone && `Phone: ${b.phone}`,
  ].filter(Boolean) as string[];
}

/**
 * Phase 1: hand the request to the hotel over WhatsApp or email.
 * Phase 2: insert into Supabase `booking_requests` via a server action, then notify the hotel.
 */
export function bookingToWhatsAppUrl(b: BookingRequest) {
  const text = [`Hello ${hotel.name}, I'd like to book.`, ...bookingLines(b)].join("\n");
  return `https://wa.me/${hotel.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Same request as an email to reservations (travel agents and groups often prefer this). */
export function bookingToMailto(b: BookingRequest) {
  const subject = `Booking request: ${b.checkIn || "dates"} to ${b.checkOut || "?"}, ${b.guests} guest${b.guests === 1 ? "" : "s"}`;
  const body = [`Hello ${hotel.name} reservations,`, "", "I'd like to book:", ...bookingLines(b), "", "Thank you."].join("\n");
  return `mailto:${hotel.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Plain email link, e.g. for travel agents. */
export const reservationsMailto = (subject = `Reservation enquiry: ${hotel.name}`) =>
  `mailto:${hotel.email}?subject=${encodeURIComponent(subject)}`;

/** Tour enquiry. Phase 2: insert into Supabase `tour_requests` instead. */
export function tourToWhatsAppUrl(tourName: string) {
  const text = `Hello ${hotel.name}, I'd like to know more about the "${tourName}" tour (car + driver). Dates and number of people:`;
  return `https://wa.me/${hotel.whatsapp}?text=${encodeURIComponent(text)}`;
}
