"use client";

import { useEffect, useId, useRef, useState } from "react";

export const MAX_GUESTS = 20;

/** "2 adults · 1 child" */
export const guestsLabel = (adults: number, children: number) =>
  [`${adults} adult${adults === 1 ? "" : "s"}`, children > 0 && `${children} child${children === 1 ? "" : "ren"}`].filter(Boolean).join(" · ");

type Props = {
  adults: number;
  childCount: number;
  onChange: (adults: number, children: number) => void;
  /** What the rooms work out to, e.g. "1 × The King". Shown under the guest count and inside the panel. */
  roomsText?: string;
  roomsCount?: number;
  label?: string;
  /** Open the panel in the page flow (inside a scrolling dialog) instead of floating over it. */
  inline?: boolean;
  className?: string;
};

/**
 * Guests field in the style of the big booking sites: one tap opens a small panel with
 * − / + steppers for adults and children, instead of a long "1 guest … 20 guests" list.
 * Rooms are still picked automatically from the guest count (best fit), so they are shown, not asked.
 */
export function GuestPicker({ adults, childCount, onChange, roomsText, roomsCount, label = "Guests", inline, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const total = adults + childCount;
  const full = total >= MAX_GUESTS;

  // close on a tap outside the panel
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };

  return (
    <div className={`field gp ${className}`} ref={wrap}>
      <span id={`${id}-l`}>{label}</span>
      <button
        ref={btn}
        type="button"
        className="gp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-p`}
        aria-labelledby={`${id}-l ${id}-v`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="gp-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 19.5c.6-3.4 3-5.3 6-5.3s5.4 1.9 6 5.3" />
          <circle cx="16.8" cy="9" r="2.5" />
          <path d="M16.2 14.3c2.6.1 4.3 1.8 4.8 4.6" />
        </svg>
        <span id={`${id}-v`} className="gp-value">
          <b>{guestsLabel(adults, childCount)}</b>
          {roomsCount != null && <small>{roomsCount} room{roomsCount === 1 ? "" : "s"}</small>}
        </span>
        <svg className="gp-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={`${id}-p`}
          className={`gp-panel${inline ? " gp-panel-inline" : ""}`}
          role="dialog"
          aria-label="Choose guests"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation(); // close this panel, not the whole booking form
              close();
            }
          }}
        >
          <Stepper
            name="Adults"
            hint="Ages 18 or above"
            value={adults}
            min={1}
            canAdd={!full}
            onChange={(a) => onChange(a, childCount)}
            autoFocus
          />
          <Stepper
            name="Children"
            hint="Ages 0–17"
            value={childCount}
            min={0}
            canAdd={!full}
            onChange={(c) => onChange(adults, c)}
          />
          {roomsText && (
            <p className="gp-rooms">
              <span>Rooms</span> {roomsText}
              <small>Every guest gets a bed. Picked for {total} guest{total === 1 ? "" : "s"}; you can change rooms on the next step.</small>
            </p>
          )}
          {full && <p className="gp-note">For more than {MAX_GUESTS} guests, please call or WhatsApp the front desk.</p>}
          <button type="button" className="gp-done" onClick={close}>Done</button>
        </div>
      )}
    </div>
  );
}

function Stepper({
  name,
  hint,
  value,
  min,
  canAdd,
  onChange,
  autoFocus,
}: {
  name: string;
  hint: string;
  value: number;
  min: number;
  canAdd: boolean;
  onChange: (n: number) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="gp-row">
      <div>
        <p className="gp-name">{name}</p>
        <p className="gp-hint">{hint}</p>
      </div>
      <div className="gp-step" role="group" aria-label={name}>
        <button type="button" aria-label={`Fewer ${name.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 12h12" /></svg>
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${name.toLowerCase()}`} disabled={!canAdd} onClick={() => onChange(value + 1)} autoFocus={autoFocus}>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 12h12M12 6v12" /></svg>
        </button>
      </div>
    </div>
  );
}
