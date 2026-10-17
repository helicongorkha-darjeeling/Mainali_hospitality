import { hotel, rooms } from "@/content/site";

export type BookingRequest = {
  checkIn: string;
  checkOut: string;
  guests: number;
  room: string; // room slug, or "" for any
  name: string;
  phone: string;
};

/**
 * Phase 1: hand the request to the hotel over WhatsApp.
 * Phase 2: insert into Supabase `booking_requests` via a server action, then notify the hotel.
 */
export function bookingToWhatsAppUrl(b: BookingRequest) {
  const roomName = rooms.find((r) => r.slug === b.room)?.name ?? "Any room";
  const lines = [
    `Hello ${hotel.name}, I'd like to book.`,
    `Check-in: ${b.checkIn || "-"}`,
    `Check-out: ${b.checkOut || "-"}`,
    `Guests: ${b.guests}`,
    `Room: ${roomName}`,
    b.name && `Name: ${b.name}`,
    b.phone && `Phone: ${b.phone}`,
  ].filter(Boolean);
  return `https://wa.me/${hotel.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Tour enquiry. Phase 2: insert into Supabase `tour_requests` instead. */
export function tourToWhatsAppUrl(tourName: string) {
  const text = `Hello ${hotel.name}, I'd like to know more about the "${tourName}" tour (car + driver). Dates and number of people:`;
  return `https://wa.me/${hotel.whatsapp}?text=${encodeURIComponent(text)}`;
}
