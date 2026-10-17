import Image from "next/image";
import { hotel, tours, tourIncludes } from "@/content/site";
import { tourToWhatsAppUrl } from "@/lib/booking";
import { Reveal } from "./Reveal";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function Experiences() {
  return (
    <section id="experiences" className="relative bg-ink px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center md:text-left">
          <p className="eyebrow">Experiences</p>
          <h2 className="h-section mt-3">Go further.</h2>
          <p className="sub mt-3">Tours with a car and driver, from our door.</p>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
          {/* the tour wall in the lobby */}
          <Reveal className="md:sticky md:top-28 md:self-start">
            <div className="exp-photo">
              <Image
                src="/images/lobby-tour-package.webp"
                alt="Tour wall in the lobby: Tiger Hill, Rock Garden, Mirik Lake and more"
                fill
                sizes="(min-width: 768px) 40vw, 90vw"
                className="object-cover"
              />
              <span className="exp-photo-label">Pick a tour at the front desk, or ask us now.</span>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {tourIncludes.map((t) => (
                <li key={t} className="exp-chip exp-chip-gold">{t}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ivory/65">{hotel.pickup}</p>
          </Reveal>

          {/* tour list */}
          <ol className="exp-list">
            {tours.map((t, i) => (
              <li key={t.slug}>
                <Reveal delay={i * 0.06}>
                  <a href={tourToWhatsAppUrl(t.name)} target="_blank" rel="noopener" className="exp-row">
                    <span className="exp-num">0{i + 1}</span>
                    <span className="flex-1">
                      <span className="block font-display text-[clamp(1.7rem,3.4vw,2.5rem)] leading-tight">{t.name}</span>
                      <span className="mt-1 block text-sm text-ivory/60">{t.line}</span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {t.stops.map((s) => (
                          <span key={s} className="exp-chip">{s}</span>
                        ))}
                      </span>
                      <span className="exp-cta mt-4 block text-xs sm:hidden">Ask about this tour →</span>
                    </span>
                    <span className="exp-meta">
                      <span className="text-ivory/70">
                        {t.priceFrom ? `from ${inr(t.priceFrom)}` : "Price on request"}
                        {t.duration && <> · {t.duration}</>}
                      </span>
                      <span className="exp-cta">Ask →</span>
                    </span>
                  </a>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
