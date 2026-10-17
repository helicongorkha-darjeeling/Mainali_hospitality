import Image from "next/image";
import { hotel } from "@/content/site";
import { reservationsMailto } from "@/lib/booking";
import { Reveal } from "./Reveal";

const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;
const waDisplay = `+${hotel.whatsapp.slice(0, 2)} ${hotel.whatsapp.slice(2, 7)} ${hotel.whatsapp.slice(7)}`;

export function Location() {
  const map = `https://www.google.com/maps?q=${encodeURIComponent(hotel.mapQuery)}&output=embed`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.mapQuery)}`;

  return (
    <section id="find-us" className="relative bg-ink px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-6xl items-start gap-12 md:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <p className="eyebrow">Location</p>
          <h2 className="h-section mt-3">Find us.</h2>
          <p className="sub mt-3">Just 50 seconds from the bus stand.</p>

          {/* contact details */}
          <dl className="contact-grid mt-10">
            <div>
              <dt>Address</dt>
              <dd>
                {hotel.name}
                <br />
                {hotel.address}
              </dd>
            </div>
            <div>
              <dt>Front desk</dt>
              <dd className="flex flex-col">
                {hotel.phones.map((p) => (
                  <a key={p} href={tel(p)}>{p}</a>
                ))}
              </dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>
                <a href={`https://wa.me/${hotel.whatsapp}`} target="_blank" rel="noopener">{waDisplay}</a>
              </dd>
            </div>
            <div className="min-[480px]:col-span-2">
              <dt>Reservations</dt>
              <dd>
                <a href={reservationsMailto()} className="[overflow-wrap:anywhere]">{hotel.email}</a>
                <span className="mt-1 block text-xs text-ivory/50">Guests, travel agents and groups</span>
              </dd>
            </div>
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href={tel(hotel.phones[0])} className="btn-ghost">Call the front desk</a>
            <a href={directions} target="_blank" rel="noopener" className="btn-ghost">Get directions</a>
            <a href={reservationsMailto()} className="btn-ghost">Email reservations</a>
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
