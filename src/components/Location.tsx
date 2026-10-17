import Image from "next/image";
import { hotel } from "@/content/site";
import { Reveal } from "./Reveal";

export function Location() {
  const map = `https://www.google.com/maps?q=${encodeURIComponent(hotel.mapQuery)}&output=embed`;
  return (
    <section id="find-us" className="relative bg-ink px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <p className="eyebrow">Find us</p>
          <h2 className="h-section mt-3">At the bus stand.</h2>
          <p className="sub mt-3">Step off, walk in. The town is at your door.</p>

          <dl className="mt-10 space-y-6 text-sm">
            <div>
              <dt className="eyebrow !text-[0.65rem]">Address</dt>
              <dd className="mt-1 text-ivory/85">{hotel.address}</dd>
            </div>
            <div>
              <dt className="eyebrow !text-[0.65rem]">Call</dt>
              <dd className="mt-1 flex flex-col gap-1">
                {hotel.phones.map((p) => (
                  <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="text-ivory/85 hover:text-gold-bright">
                    {p}
                  </a>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`https://wa.me/${hotel.whatsapp}`} target="_blank" rel="noopener" className="btn-ghost">
              WhatsApp
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.mapQuery)}`}
              target="_blank"
              rel="noopener"
              className="btn-ghost"
            >
              Directions
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative grid gap-4 sm:grid-cols-[0.8fr_1fr]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image src="/images/teesta-neighbourhood-view.webp" alt="View of the street from a room" fill sizes="(min-width: 768px) 25vw, 90vw" className="object-cover" />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-ivory/10 sm:aspect-auto">
              <iframe
                title="Map to Hotel Teesta"
                src={map}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full grayscale-[0.6] invert-[0.9] hue-rotate-180"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
