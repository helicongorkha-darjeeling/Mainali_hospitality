"use client";

import { useEffect, useState } from "react";
import { hotel, nav } from "@/content/site";
import { scrollToHash } from "./SmoothScroll";

export function Navbar({ logoSvg }: { logoSvg: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setPastHero(window.scrollY > window.innerHeight * 0.45);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenu(false);
    scrollToHash(href);
  };

  return (
    <header className="nav" data-scrolled={scrolled} data-menu={menu}>
      <div className="nav-inner">
        <a
          href="#top"
          onClick={(e) => go(e, "#top")}
          className="nav-logo"
          data-visible={pastHero || menu}
          aria-label={`${hotel.name}, back to top`}
          dangerouslySetInnerHTML={{ __html: logoSvg }}
        />

        <nav className="nav-links" aria-label="Main">
          {nav.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href={`tel:${hotel.phones[0].replace(/\s/g, "")}`} className="nav-call">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
            <span className="hidden sm:inline">Call</span>
          </a>
          <button className="nav-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className="nav-sheet" aria-hidden={!menu} inert={!menu}>
        {nav.map((l, i) => (
          <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} style={{ transitionDelay: `${80 + i * 50}ms` }}>
            {l.label}
          </a>
        ))}
        <p className="mt-10 text-sm text-ivory/60">{hotel.address}</p>
      </div>
    </header>
  );
}
