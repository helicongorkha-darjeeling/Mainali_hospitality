"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import { useNearOnce } from "./three/useInView";

const GalleryScene = dynamic(() => import("./three/GalleryScene"), { ssr: false });

export function Gallery() {
  const track = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  // Don't download the 3D textures until the visitor is about two screens away from the gallery.
  const near = useNearOnce(track, "200% 0px");

  const onProgress = useCallback((p: number) => {
    if (intro.current) intro.current.style.opacity = String(Math.max(0, 1 - p * 7));
    if (outro.current) outro.current.style.opacity = String(Math.max(0, (p - 0.86) * 7));
    if (bar.current) bar.current.style.transform = `scaleX(${p})`;
  }, []);

  return (
    <section id="gallery" ref={track} className="relative h-[520vh] bg-ink">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {near && <GalleryScene track={track} onProgress={onProgress} />}

        <div ref={intro} className="pointer-events-none absolute inset-x-0 top-[17%] flex flex-col items-center px-6 text-center">
          <p className="eyebrow">Gallery</p>
          <h2 className="h-section mt-3">Take a look.</h2>
          <p className="sub mt-3">Scroll to walk in.</p>
        </div>

        <div ref={outro} className="pointer-events-none absolute inset-x-0 top-[17%] flex flex-col items-center px-6 text-center opacity-0">
          <h2 className="h-section">See you soon.</h2>
          <p className="sub mt-3">Darjeeling is waiting.</p>
        </div>

        <div className="absolute inset-x-6 top-24 mx-auto h-px max-w-md bg-ivory/10 sm:top-28">
          <div ref={bar} className="h-full origin-left scale-x-0 bg-gold" />
        </div>
      </div>
    </section>
  );
}
