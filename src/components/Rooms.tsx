"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { rooms } from "@/content/site";
import { useBooking } from "./BookingProvider";

const N = rooms.length;
const STEP = 360 / N;

export function Rooms() {
  const section = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const { open } = useBooking();

  // shared mutable state for the render loop
  const s = useRef({ scroll: 0, drag: 0, current: 0, radius: 420, dragging: false, lastX: 0, moved: 0 });

  useEffect(() => {
    const st = s.current;
    const sizeRing = () => {
      const w = Math.min(window.innerWidth, 1400);
      const stageH = ring.current?.parentElement?.clientHeight ?? 500;
      const byWidth = w < 640 ? 210 : w < 1024 ? 250 : 290;
      const card = Math.round(Math.max(150, Math.min(byWidth, (stageH * 0.86) / 1.3)));
      ring.current?.style.setProperty("--card-w", `${card}px`);
      st.radius = (card / 2 / Math.tan(Math.PI / N)) * 1.18;
    };
    sizeRing();
    window.addEventListener("resize", sizeRing);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 2.2}`,
        pin: ".rooms-pin",
        scrub: true,
        onUpdate: (self) => (st.scroll = self.progress * (N - 1) * STEP),
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
      const target = st.scroll + st.drag;
      st.current += (target - st.current) * 0.09;
      const angle = -st.current;
      if (ring.current) {
        ring.current.style.transform = `translateZ(${-st.radius}px) rotateX(-4deg) rotateY(${angle}deg)`;
      }
      cards.current.forEach((el, i) => {
        if (!el) return;
        const diff = ((((i * STEP + angle) % 360) + 540) % 360) - 180; // -180..180, 0 = facing
        const facing = Math.cos((diff * Math.PI) / 180);
        el.style.transform = `rotateY(${i * STEP}deg) translateZ(${st.radius}px)`;
        el.style.opacity = String(Math.max(0, 0.2 + 0.8 * facing));
        el.style.visibility = facing < -0.1 ? "hidden" : "visible";
        el.style.filter = `brightness(${0.45 + 0.55 * Math.max(0, facing)})`;
      });
      const a = ((Math.round(st.current / STEP) % N) + N) % N;
      if (a !== lastActive) {
        lastActive = a;
        setActive(a);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sizeRing);
      ctx.revert();
    };
  }, []);

  /* drag to spin (horizontal only, vertical still scrolls the page) */
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
    st.drag -= dx * 0.25;
  };
  const onUp = () => {
    const st = s.current;
    st.dragging = false;
    // settle on the nearest card
    const total = st.scroll + st.drag;
    gsap.to(st, { drag: st.drag + (Math.round(total / STEP) * STEP - total), duration: 0.6, ease: "power3.out" });
  };

  const pick = (i: number) => {
    const st = s.current;
    if (st.moved > 6) return; // that was a drag, not a tap
    if (i === active) return open(rooms[i].slug);
    const total = st.scroll + st.drag;
    const cur = total / STEP;
    let delta = i - (((Math.round(cur) % N) + N) % N);
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    gsap.to(st, { drag: st.drag + (Math.round(cur) + delta) * STEP - total, duration: 0.9, ease: "power3.inOut" });
  };

  const room = rooms[active];

  return (
    <section id="rooms" ref={section} className="relative bg-ink">
      <div className="rooms-pin relative flex h-[100svh] flex-col overflow-hidden">
        <div className="rooms-head relative z-10 px-6 pt-24 text-center sm:pt-28">
          <p className="eyebrow">Rooms</p>
          <h2 className="h-section mt-3">Rest well.</h2>
          <p className="sub mt-3">Warm rooms for two to six.</p>
        </div>

        <div
          className="ring-stage"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => s.current.dragging && onUp()}
        >
          <div ref={ring} className="ring">
            {rooms.map((r, i) => (
              <button
                key={r.slug}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                className="ring-card"
                onClick={() => pick(i)}
                aria-label={i === active ? `Book the ${r.name} room` : `Show the ${r.name} room`}
              >
                <Image src={r.image} alt="" fill sizes="300px" className="object-cover" draggable={false} />
                <span className="ring-card-shade" />
                <span className="ring-card-label">
                  <span className="font-display text-2xl">{r.name}</span>
                  <span className="text-xs tracking-[0.2em] uppercase text-ivory/70">{r.guests} guests</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 pb-28 text-center">
          <p key={room.slug} className="room-line font-display text-2xl italic text-gold-bright">{room.line}</p>
          <button onClick={() => open(room.slug)} className="link-gold mt-3">
            Book the {room.name.toLowerCase()} room →
          </button>
        </div>
      </div>
    </section>
  );
}
