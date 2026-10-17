"use client";

import type { RoomSlug } from "@/content/site";

/**
 * The booking draft travels from the Book Now form to /book in sessionStorage,
 * so the guest's name and phone never appear in the URL.
 */
export type BookingDraft = {
  checkIn: string;
  checkOut: string;
  guests: number;
  room: RoomSlug | "";
  name: string;
  phone: string;
  email?: string;
};

const KEY = "teesta.booking.draft";

export function saveDraft(d: BookingDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* private mode: the /book page falls back to the URL values */
  }
}

export function loadDraft(): Partial<BookingDraft> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
