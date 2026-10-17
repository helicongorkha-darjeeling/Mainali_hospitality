"use client";

import { useEffect, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import { getLenis } from "./SmoothScroll";
import { rooms } from "@/content/site";
import { bookingToWhatsAppUrl } from "@/lib/booking";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function BookingSheet() {
  const { isOpen, room, close } = useBooking();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    getLenis()?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("input")?.focus();
    return () => {
      getLenis()?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  return (
    <div className="sheet" data-open={isOpen} aria-hidden={!isOpen}>
      <button className="sheet-scrim" aria-label="Close" tabIndex={-1} onClick={close} />
      <div
        ref={panelRef}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        inert={!isOpen}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Hotel Teesta · Darjeeling</p>
            <h2 id="sheet-title" className="font-display mt-2 text-4xl leading-none">Your stay.</h2>
          </div>
          <button onClick={close} className="sheet-x" aria-label="Close booking">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Keyed by room: choosing another room starts a fresh form with matching guests. */}
        <BookingForm key={room} initialRoom={room} />
      </div>
    </div>
  );
}

function BookingForm({ initialRoom }: { initialRoom: string }) {
  const [today] = useState(() => iso(new Date()));
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(() => rooms.find((r) => r.slug === initialRoom)?.guests ?? 2);
  const [roomSlug, setRoomSlug] = useState(initialRoom);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = bookingToWhatsAppUrl({ checkIn, checkOut, guests, room: roomSlug, name, phone });
    window.open(url, "_blank", "noopener");
  };

  return (
    <form onSubmit={submit} className="mt-7 grid grid-cols-2 gap-3">
      <label className="field">
        <span>Check-in</span>
        <input type="date" required min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      </label>
      <label className="field">
        <span>Check-out</span>
        <input type="date" required min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </label>
      <label className="field">
        <span>Guests</span>
        <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Room</span>
        <select value={roomSlug} onChange={(e) => setRoomSlug(e.target.value)}>
          <option value="">Any</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>{r.name}</option>
          ))}
        </select>
      </label>
      <label className="field col-span-2 sm:col-span-1">
        <span>Name</span>
        <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </label>
      <label className="field col-span-2 sm:col-span-1">
        <span>Phone</span>
        <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />
      </label>

      <button type="submit" className="btn-gold col-span-2 mt-3">Send on WhatsApp</button>
      <p className="col-span-2 text-center text-xs text-ivory/50">We reply with rates and confirm your room.</p>
    </form>
  );
}
