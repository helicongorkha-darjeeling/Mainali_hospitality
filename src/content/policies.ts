/**
 * Guest policies. TODO(client): the hotel owner must review and approve these
 * (especially the cancellation schedule) before taking real payments.
 */
import { hotel, rooms } from "./site";
import { cancellationRules, mealPlans, stayTimes, upi } from "./booking";

const refundLine = () => {
  const [full, part] = [...cancellationRules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  return `Cancel at least ${full.hoursBefore} hours before check-in (${stayTimes.checkInLabel} on your arrival day) for a full refund. Cancel between ${part.hoursBefore} and ${full.hoursBefore} hours before check-in for a ${part.refundPct}% refund. Cancellations less than ${part.hoursBefore} hours before check-in, and no-shows, are not refunded.`;
};

export type Policy = { title: string; intro: string; sections: [string, string][] };

export const policies: Record<"booking-terms" | "cancellation" | "privacy", Policy> = {
  "booking-terms": {
    title: "Booking terms",
    intro: `These terms apply when you book ${hotel.name}, ${hotel.city} (run by ${hotel.brand}) on this website.`,
    sections: [
      ["Direct rates", "Prices on this website are the hotel's direct rates, per room per night. Taxes (GST) are shown separately before you pay. There is no convenience fee for booking direct."],
      ["Rooms and guests", `Each room sleeps up to the number of guests shown: ${rooms.map((r) => `${r.name} up to ${r.maxGuests}`).join(", ")}. For more guests, book more rooms or ask the front desk. Room numbers are assigned at check-in.`],
      ["Meal plans", `${mealPlans.map((m) => `${m.code}: ${m.name.toLowerCase()}${m.perGuestNight ? ` (₹${m.perGuestNight} per guest per night)` : ""}`).join("; ")}. Meal plans are charged per guest, per night.`],
      ["Check-in and check-out", `Check-in is from ${stayTimes.checkInLabel} and check-out is by ${stayTimes.checkOutLabel}. Early check-in and late check-out depend on availability and may be charged.`],
      ["ID at check-in", "Every adult guest must show a valid government photo ID at check-in. Foreign nationals must show a passport and valid visa, which the hotel registers as required by Indian law. The hotel may refuse check-in without valid ID."],
      ["Payment and confirmation", `You pay the full amount by UPI to the hotel's merchant account (${upi.payeeName}, ${upi.bank}). The payment note carries your booking ID, so the hotel can match it to your booking. Your booking is confirmed when the hotel has received the payment and confirmed it to you by WhatsApp or email. If a payment cannot be found, the booking is not confirmed.`],
      ["Pricing errors", "If a room is shown at a clearly wrong price because of a technical error, the hotel may cancel the booking and refund you in full."],
      ["During your stay", "Guests are responsible for any damage to hotel property caused during their stay. Please respect other guests, especially at night."],
      ["Contact", `Questions about a booking: ${hotel.email} or ${hotel.phones[0]}.`],
    ],
  },
  cancellation: {
    title: "Cancellation and refunds",
    intro: "Plans change. Here is how cancelling a direct booking works.",
    sections: [
      ["Refund schedule", refundLine()],
      ["How to cancel", `Send your booking ID on WhatsApp (${hotel.phones[0]}) or email ${hotel.email}. The time we receive your message counts as your cancellation time.`],
      ["Refunds", "Refunds are sent to the UPI account you paid from. We aim to process them within 7 working days of your cancellation; your bank may take a little longer to show the money."],
      ["Changing dates", "Contact us to move your dates. We'll move your booking if rooms are available; any difference in price applies."],
      ["Leaving early", "Nights booked but not used after you check in are not refunded."],
      ["If the hotel cancels", "If the hotel has to cancel your booking, you get a full refund."],
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: `${hotel.name} (${hotel.brand}, ${hotel.address}) respects your privacy and handles personal data in line with India's Digital Personal Data Protection Act, 2023.`,
    sections: [
      ["What we collect", "When you book: your name, phone number, email address, stay dates, number of guests, rooms, meal plan, and any special requests. As soon as you enter your phone number in the booking form, we save it with your name and stay details, even if you don't finish booking. At check-in, the hotel records ID details as required by law."],
      ["Why we use it", "To manage and confirm your booking, call you if you started a booking and didn't finish it, contact you about your stay, process refunds, and meet legal registration requirements. We do not use your details for marketing unless you ask us to."],
      ["Payments", "Payments are made in your own UPI app. We never see your UPI PIN or bank login. We only receive the amount and the payment reference."],
      ["Sharing", "We don't sell your data. When you choose to send your booking to the hotel by WhatsApp or email, it goes through those services. Our website is hosted by Vercel, and booking details are stored with Supabase on servers in Mumbai, India. We share details with authorities only when the law requires it, for example the registration of foreign guests."],
      ["On this website", "While you book, your details are kept in your browser's session storage so the next step can use them; they are cleared when you close the tab. We don't use advertising cookies. The map on the Find us section is provided by Google Maps, which may set its own cookies."],
      ["How long we keep it", "We keep booking records for as long as needed to manage your stay and to meet tax and legal record-keeping requirements, then delete them."],
      ["Your rights", `You can ask to see, correct or delete your personal data, or withdraw consent, by emailing ${hotel.email}. You can also raise a grievance at the same address, and we will respond as required by law.`],
    ],
  },
};

export const policyLinks = [
  { slug: "booking-terms", label: "Booking terms" },
  { slug: "cancellation", label: "Cancellation & refunds" },
  { slug: "privacy", label: "Privacy" },
] as const;
