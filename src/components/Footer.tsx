import { hotel, nav } from "@/content/site";

export function Footer() {
  return (
    <footer className="border-t border-ivory/10 bg-ink px-5 pb-36 pt-16 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center md:flex-row md:items-start md:justify-between md:text-left">
        <div>
          <p className="font-display text-3xl">{hotel.name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-ivory/50">by {hotel.brand}</p>
          <p className="mt-4 text-sm text-ivory/60">{hotel.address}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ivory/70" aria-label="Footer">
          {nav.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-gold-bright">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-1 text-sm md:items-end">
          <a href={`tel:${hotel.phones[0].replace(/\s/g, "")}`} className="text-ivory/80 hover:text-gold-bright">
            {hotel.phones[0]}
          </a>
          <a href={`mailto:${hotel.email}`} className="text-ivory/80 hover:text-gold-bright">
            {hotel.email}
          </a>
          <p className="mt-3 text-xs text-ivory/40">© {new Date().getFullYear()} {hotel.brand}</p>
        </div>
      </div>
    </footer>
  );
}
