"use client";

import Image from "next/image";
import { useState } from "react";
import { amenities, roomRates, stayTimes } from "@/content/booking";
import { hotel, roomInventory, rooms, type RoomSlug } from "@/content/site";
import {
  cancellationWindows,
  discountPct,
  formatDay,
  formatWeekday,
  inr,
  nightlyTaxes,
  type Quote,
  type RoomQty,
} from "@/lib/pricing";

/* ---------------------------------------------------------------- deal price (anchored discount) */
export function DealPrice({ slug }: { slug: RoomSlug }) {
  const r = roomRates[slug];
  return (
    <div className="deal">
      <span className="deal-badge">Jackpot deal</span>
      <p className="deal-price">{inr(r.direct)}</p>
      <p className="deal-tax">+ {inr(nightlyTaxes(slug))} taxes &amp; fees / night</p>
      <p className="deal-was">
        <s>{inr(r.rack)}</s> <span>{discountPct(slug)}% off</span>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- quantity stepper */
export function Stepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`One less ${label}`}>
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- amenities */
/** TV varies by room (see the room chart): every Quad has one, some Kings and Triples do. */
export function tvLabel(slug: RoomSlug) {
  const units = roomInventory.filter((r) => r.type === slug);
  const withTv = units.filter((r) => r.tv).length;
  if (withTv === 0) return null;
  return withTv === units.length ? "TV" : "TV (select rooms)";
}

export function Amenities({ slug, compact = false }: { slug: RoomSlug; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const tv = tvLabel(slug);
  const groups = amenities.map((g) => ({
    ...g,
    items: g.items.flatMap((i) => (i === "TV" ? (tv ? [tv] : []) : [i])),
  }));
  return (
    <div className="amen">
      {compact && (
        <button type="button" className="amen-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Hide room features" : "See all room features"}
        </button>
      )}
      {open && (
        <div className="amen-grid">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="amen-title">{g.group}</p>
              <ul>
                {g.items.map((i) => (
                  <li key={i}>
                    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- price breakup */
export function PriceCard({ q, guests }: { q: Quote; guests: number }) {
  const nightsLabel = `${q.nights} night${q.nights > 1 ? "s" : ""}`;
  const roomsLabel = `${q.rooms} room${q.rooms > 1 ? "s" : ""}`;
  return (
    <div className="pcard">
      <p className="pcard-title">Price breakup</p>
      <dl>
        <div>
          <dt>{roomsLabel} × {nightsLabel}</dt>
          <dd>{inr(q.rack)}</dd>
        </div>
        <div className="pcard-green">
          <dt>Direct booking discount</dt>
          <dd>−{inr(q.discount)}</dd>
        </div>
        {q.meals > 0 && (
          <div>
            <dt>
              {q.mealPlan.name}
              <small>{guests} guest{guests > 1 ? "s" : ""} × {nightsLabel}</small>
            </dt>
            <dd>{inr(q.meals)}</dd>
          </div>
        )}
        <div>
          <dt>Taxes (GST)</dt>
          <dd>{inr(q.taxes)}</dd>
        </div>
        <div>
          <dt>Convenience fee</dt>
          <dd className="pcard-free">{q.fee ? inr(q.fee) : "Free"}</dd>
        </div>
      </dl>
      <div className="pcard-total">
        <div>
          <p>Total</p>
          <small>{roomsLabel} · {nightsLabel}</small>
        </div>
        <p className="pcard-sum">{inr(q.total)}</p>
      </div>
      {q.savings > 0 && (
        <p className="pcard-save">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M4.5 8.2l2.3 2.3 4.7-4.7" fill="none" stroke="#fff" strokeWidth="1.6" /></svg>
          Total saving of {inr(q.savings)}
        </p>
      )}
      <p className="pcard-note">Best price, booked direct with the hotel. No hidden fees.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- itinerary ticket */
export function Ticket({
  checkIn,
  checkOut,
  nights,
  qty,
  guests,
  mealPlanName,
  bookingId,
  guestName,
}: {
  checkIn: string;
  checkOut: string;
  nights: number;
  qty: RoomQty;
  guests: number;
  mealPlanName: string;
  bookingId?: string;
  guestName?: string;
}) {
  const roomCount = qty.king + qty.triple + qty.quad + qty.family;
  return (
    <div className="ticket">
      <div className="ticket-top">
        <div>
          <p className="ticket-kicker">Hotel in Chowk Bazaar, Darjeeling</p>
          <p className="ticket-hotel">{hotel.name}</p>
          <p className="ticket-addr">{hotel.address}</p>
          {guestName && (
            <p className="ticket-guest">
              <span>Guest</span> {guestName}
            </p>
          )}
        </div>
        <div className="ticket-photo">
          <Image src="/images/teesta-hotel-under-the-blue-sky.webp" alt="Hotel Teesta" fill sizes="120px" className="object-cover" />
        </div>
      </div>
      <div className="ticket-cut" aria-hidden />
      <div className="ticket-row">
        <div>
          <p className="ticket-label">Check-in</p>
          <p className="ticket-date">{formatDay(checkIn)}</p>
          <p className="ticket-sub">{formatWeekday(checkIn)}, {stayTimes.checkInLabel}</p>
        </div>
        <span className="ticket-nights">{nights} night{nights > 1 ? "s" : ""}</span>
        <div>
          <p className="ticket-label">Check-out</p>
          <p className="ticket-date">{formatDay(checkOut)}</p>
          <p className="ticket-sub">{formatWeekday(checkOut)}, {stayTimes.checkOutLabel}</p>
        </div>
        <div className="ticket-split">
          <p className="ticket-label">Rooms &amp; guests</p>
          <p className="ticket-date">
            {roomCount} Room{roomCount > 1 ? "s" : ""}, {guests} Guest{guests > 1 ? "s" : ""}
          </p>
          <p className="ticket-sub">{mealPlanName}</p>
        </div>
      </div>
      <div className="ticket-rooms">
        {rooms
          .filter((r) => qty[r.slug] > 0)
          .map((r) => (
            <span key={r.slug}>{qty[r.slug]} × {r.name}</span>
          ))}
        {bookingId && <span className="ticket-id">Booking ID {bookingId}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- cancellation policy */
const fmtWhen = (d: Date) =>
  d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export function CancellationPolicy({ checkIn }: { checkIn: string }) {
  const windows = cancellationWindows(checkIn).filter((w) => !w.passed);
  return (
    <div className="cancel">
      <p className="bk-h3">Cancellation policy</p>
      {windows.length === 0 || (windows.length === 1 && windows[0].refundPct === 0) ? (
        <p className="cancel-note">Check-in is less than 24 hours away, so this booking is non-refundable.</p>
      ) : (
        <p className="cancel-note">Refunds go back to the UPI account you paid from.</p>
      )}
      <div className="cancel-bar">
        {windows.map((w) => (
          <div key={w.refundPct} data-pct={w.refundPct} style={{ flex: Math.max(1, (w.to.getTime() - w.from.getTime()) / 3_600_000) }}>
            <span className="cancel-seg" />
            <p className="cancel-pct">{w.refundPct === 100 ? "Full refund" : w.refundPct === 0 ? "No refund" : `${w.refundPct}% refund`}</p>
            <p className="cancel-when">{w.refundPct === 0 ? `after ${fmtWhen(w.from)}` : `until ${fmtWhen(w.to)}`}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
