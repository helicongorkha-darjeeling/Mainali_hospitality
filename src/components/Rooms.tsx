"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { rooms } from "@/content/site";
import { useBooking } from "./BookingProvider";

const N = rooms.length;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * The four room types as a 3D carousel: the front card faces you, the others fan out
 * to the sides in depth. It advances as you scroll (section is pinned) and can be dragged.
 */
export function Rooms() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const { open } = useBooking();

  // shared mutable state for the render loop (positions are in "card index" units)
  const s = useRef({ scroll: 0, drag: 0, current: 0, card: 290, dragging: false, lastX: 0, moved: 0 });

  useEffect(() => {
    const st = s.current;
    const size = () => {
      const w = window.innerWidth;
      const h = stage.current?.clientHeight ?? 500;
      const byWidth = w < 640 ? Math.min(250, w * 0.66) : w < 1024 ? 270 : 300;
      st.card = Math.round(Math.max(170, Math.min(byWidth, (h * 0.9) / 1.3)));
      stage.current?.style.setProperty("--card-w", `${st.card}px`);
    };
    size();
    window.addEventListener("resize", size);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 1.8}`,
        pin: ".rooms-pin",
        scrub: true,
        onUpdate: (self) => (st.scroll = self.progress * (N - 1)),
      });
      gsap.from(".rooms-head > *", {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: section.current, start: "top 70%" },
      });
    }, section);

    let raf = 0;
    let lastActive = -1;
    const loop = () => {
      const target = clamp(st.scroll + st.drag, 0, N - 1);
      st.current += (target - st.current) * 0.1;
      const narrow = window.innerWidth < 640;
      const spacing = st.card * (narrow ? 0.6 : 0.82);

      cards.current.forEach((el, i) => {
        if (!el) return;
        const d = i - st.current; // 0 = front
        const ad = Math.abs(d);
        const x = d * spacing;
        const z = -ad * (narrow ? 160 : 230);
        const ry = clamp(-d * 38, -62, 62);
        const sc = 1 - Math.min(ad, 2) * 0.05;
        el.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${ry}deg) scale(${sc})`;
        el.style.zIndex = String(100 - Math.round(ad * 10));
        el.style.opacity = String(clamp(1.35 - ad * 0.45, 0, 1));
        el.style.filter = `brightness(${1 - Math.min(ad, 1) * 0.5})`;
      });

      const a = Math.round(st.current);
      if (a !== lastActive) {
        lastActive = a;
        setActive(a);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      ctx.revert();
    };
  }, []);

  /* drag sideways to flip through rooms (vertical still scrolls the page) */
  const onDown = (e: React.PointerEvent) => {
    s.current.dragging = true;
    s.current.lastX = e.clientX;
    s.current.moved = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.dragging) return;
    const dx = e.clientX - st.lastX;
    st.lastX = e.clientX;
    st.moved += Math.abs(dx);
    st.drag -= dx / (st.card * 0.82);
  };
  const settle = (to?: number) => {
    const st = s.current;
    const total = clamp(st.scroll + st.drag, 0, N - 1);
    const goal = to ?? Math.round(total);
    gsap.to(st, { drag: st.drag + (goal - total), duration: 0.7, ease: "power3.out" });
  };
  const onUp = () => {
    if (!s.current.dragging) return;
    s.current.dragging = false;
    settle();
  };

  const pick = (i: number) => {
    if (s.current.moved > 6) return; // that was a drag, not a tap
    if (i === active) return open(rooms[i].slug);
    settle(i);
  };

  const room = rooms[active];

  return (
    <section id="rooms" ref={section} className="relative bg-ink">
      <div className="rooms-pin relative flex h-[100svh] flex-col overflow-hidden">
        <div className="rooms-head relative z-10 px-6 pt-24 text-center sm:pt-28">
          <p className="eyebrow">Rooms</p>
          <h2 className="h-section mt-3">Stay your way.</h2>
          <p className="sub mt-3">Four room types, for one to six guests.</p>
        </div>

        <div
          ref={stage}
          className="flow-stage"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        >
          {rooms.map((r, i) => (
            <button
              key={r.slug}
              ref={(el) => {
                cards.current[i] = el;
              }}
              className="flow-card"
              onClick={() => pick(i)}
              aria-label={i === active ? `Book ${r.name}` : `Show ${r.name}`}
            >
              <Image src={r.image} alt="" fill sizes="320px" className="object-cover" draggable={false} />
              <span className="ring-card-shade" />
              <span className="ring-card-label">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-gold-bright">0{i + 1}</span>
                <span className="font-display text-[1.7rem] leading-tight">{r.name}</span>
                <span className="text-[0.66rem] uppercase tracking-[0.2em] text-ivory/75">{r.occupancy}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="relative z-10 px-6 pb-24 text-center sm:pb-28">
          <div key={room.slug} className="room-line">
            <p className="font-display text-2xl italic text-gold-bright">{room.line}</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
              {room.features.map((f) => (
                <li key={f} className="exp-chip">{f}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex items-center justify-center gap-5">
            <div className="flow-dots" aria-hidden>
              {rooms.map((r, i) => (
                <span key={r.slug} data-on={i === active} />
              ))}
            </div>
            <button onClick={() => open(room.slug)} className="link-gold">
              Book {room.name} →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
