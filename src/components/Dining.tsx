"use client";

import Image from "next/image";
import { useRef } from "react";
import { dining } from "@/content/site";
import { Reveal } from "./Reveal";

function TiltCard({ item, i }: { item: (typeof dining)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${-y * 10}deg`);
    el.style.setProperty("--ry", `${x * 12}deg`);
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <Reveal delay={i * 0.12} className={i === 1 ? "md:translate-y-16" : ""}>
      <div ref={ref} className="tilt" onPointerMove={move} onPointerLeave={leave}>
        <div className="tilt-inner">
          <Image src={item.image} alt={item.title} fill sizes="(min-width: 768px) 33vw, 90vw" className="object-cover" />
          <span className="tilt-glare" />
          <div className="tilt-label">
            <h3 className="font-display text-3xl">{item.title}</h3>
            <p className="text-sm text-ivory/80">{item.line}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function Dining() {
  return (
    <section id="dining" data-tone="light" className="relative bg-ivory px-5 py-28 text-ink sm:px-8 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="eyebrow !text-gold-deep">Dining</p>
          <h2 className="h-section mt-3">Eat in.</h2>
          <p className="sub mt-3 !text-ink/60">Expert chef. Room service or restaurant.</p>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
          {dining.map((d, i) => (
            <TiltCard key={d.title} item={d} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
