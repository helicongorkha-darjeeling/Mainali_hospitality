"use client";

import { useEffect, useRef } from "react";
import { useBooking } from "./BookingProvider";

/**
 * Book Now, fixed in the exact centre of the screen. It never moves.
 * Transparent at rest, gold when hovered or focused.
 * Over light sections ([data-tone="light"]) it switches to dark text so it stays readable.
 */
export function BookNow() {
  const { open, isOpen } = useBooking();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      const light = Array.from(document.querySelectorAll<HTMLElement>('[data-tone="light"]')).some((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      el.dataset.tone = light ? "light" : "dark";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrap} className="bn" data-hidden={isOpen} data-tone="dark">
      <button type="button" className="bn-btn" onClick={() => open()} aria-haspopup="dialog">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mainali-knot.svg" alt="" width={18} height={18} className="bn-knot" />
        <span>Book now</span>
      </button>
    </div>
  );
}
