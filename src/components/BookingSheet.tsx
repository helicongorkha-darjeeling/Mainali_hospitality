"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "./BookingProvider";
import { getLenis } from "./SmoothScroll";
import { hotel, rooms, type RoomSlug } from "@/content/site";
import { bookingToMailto, bookingToWhatsAppUrl } from "@/lib/booking";
import { addDays, allocateRooms, describeRooms, nightsBetween, todayISO } from "@/lib/pricing";
import { loadDraft, saveDraft } from "@/lib/draft";
import { captureLead } from "@/lib/leads";
import { fullName, titles } from "@/lib/guest";

export function BookingSheet() {
  const { isOpen, everOpened, room, close } = useBooking();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    getLenis()?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("select, input")?.focus();
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

        {/* Mounted on first open (client only, so "today" is the guest's today). Keyed by room. */}
        {everOpened && <BookingForm key={room} initialRoom={room as RoomSlug | ""} />}
      </div>
    </div>
  );
}

function BookingForm({ initialRoom }: { initialRoom: RoomSlug | "" }) {
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  const [init] = useState(() => {
    const d = loadDraft();
    const today = todayISO();
    const checkIn = d.checkIn && d.checkIn >= today ? d.checkIn : today;
    const checkOut = d.checkOut && d.checkOut > checkIn ? d.checkOut : addDays(checkIn, 1);
    const fromRoom = rooms.find((r) => r.slug === initialRoom)?.maxGuests;
    return { today, checkIn, checkOut, guests: fromRoom ?? d.guests ?? 2, title: d.title ?? "", name: d.name ?? "", phone: d.phone ?? "" };
  });
  const [checkIn, setCheckIn] = useState(init.checkIn);
  const [checkOut, setCheckOut] = useState(init.checkOut);
  const [guests, setGuests] = useState(init.guests);
  const [roomSlug, setRoomSlug] = useState<RoomSlug | "">(initialRoom);
  const [title, setTitle] = useState(init.title);
  const [name, setName] = useState(init.name);
  const [phone, setPhone] = useState(init.phone);

  // Load the booking page in the background while the guest fills this in, so Book feels instant.
  useEffect(() => {
    router.prefetch("/book");
  }, [router]);

  const nights = nightsBetween(checkIn, checkOut);
  const plan = useMemo(() => describeRooms(allocateRooms(guests, roomSlug)), [guests, roomSlug]);
  const req = { checkIn, checkOut, guests, room: roomSlug, title, name, phone };

  const changeCheckIn = (v: string) => {
    setCheckIn(v);
    if (checkOut <= v) setCheckOut(addDays(v, 1));
  };

  // the phone number is the lead: save it as soon as it's entered, booked or not
  const lead = () => captureLead({ phone, name: fullName(title, name), checkIn, checkOut, guests, rooms: plan, stage: "details" });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    lead();
    saveDraft(req); // dates, guests, room and contact travel in sessionStorage; /book reads them
    // the form stays open, showing "Opening…", until the booking page is on screen
    startOpening(() => router.push("/book"));
  };

  return (
    <form onSubmit={submit} className="mt-7 grid grid-cols-2 gap-3" autoComplete="on">
      <label className="field">
        <span>Check-in</span>
        <input type="date" name="check-in" required min={init.today} value={checkIn} onChange={(e) => changeCheckIn(e.target.value)} />
      </label>
      <label className="field">
        <span>Check-out · {nights} night{nights > 1 ? "s" : ""}</span>
        <input type="date" name="check-out" required min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </label>
      <label className="field">
        <span>Guests</span>
        <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Room</span>
        <select value={roomSlug} onChange={(e) => setRoomSlug(e.target.value as RoomSlug | "")}>
          <option value="">Best fit</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>{r.name} · up to {r.maxGuests}</option>
          ))}
        </select>
      </label>
      <p className="col-span-2 -mt-1 text-xs text-gold-bright" aria-live="polite">
        Best fit: {plan}
      </p>
      <div className="field col-span-2 sm:col-span-1">
        <label htmlFor="bk-name">Name</label>
        <div className="field-row">
          <select aria-label="Title (optional)" autoComplete="honorific-prefix" value={title} onChange={(e) => setTitle(e.target.value)}>
            {titles.map((t) => (
              <option key={t} value={t}>{t || "Title"}</option>
            ))}
          </select>
          <input id="bk-name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} onBlur={lead} placeholder="Your full name" />
        </div>
      </div>
      <label className="field col-span-2 sm:col-span-1">
        <span>Phone</span>
        <input
          type="tel"
          name="tel"
          autoComplete="tel"
          required
          inputMode="tel"
          pattern="[0-9+\s\-]{8,16}"
          title="Phone number, e.g. +91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={lead}
          placeholder="+91"
        />
      </label>

      <button type="submit" className="btn-gold col-span-2 mt-3" disabled={opening} aria-busy={opening}>
        {opening ? <span className="btn-busy">Opening your booking…</span> : "Book"}
      </button>
      <p className="col-span-2 text-center text-xs leading-relaxed text-ivory/55">
        Prefer to talk?{" "}
        <a href={bookingToWhatsAppUrl(req)} target="_blank" rel="noopener" className="text-gold-bright hover:underline">WhatsApp</a>
        {" · "}
        <a href={bookingToMailto(req)} className="text-gold-bright hover:underline">Email</a>
        <br />
        Travel agents and groups:{" "}
        <a href={`mailto:${hotel.email}`} className="text-gold-bright hover:underline">{hotel.email}</a>
      </p>
    </form>
  );
}
