"use client";

import { useEffect, useRef, useState } from "react";
import { hotel, heroChapters } from "@/content/site";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Opacity for a chapter: fades in over `f`, holds, fades out over `f`. The first chapter starts fully visible. */
function chapterAlpha(p: number, from: number, to: number, first: boolean, f = 0.03) {
  const fadeIn = first ? 1 : clamp((p - from) / f);
  const fadeOut = clamp((to - p) / f);
  return Math.min(fadeIn, fadeOut);
}

/**
 * Scroll-scrubbed hero: the video moves forward only while you scroll, and pauses when you stop.
 * Desktop shows the vertical video as a 3D card over a blurred copy of itself; phones show it full screen.
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLCanvasElement>(null);
  const chapterEls = useRef<(HTMLDivElement | null)[]>([]);
  const railFill = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const v = video.current;
    const sec = section.current;
    if (!v || !sec) return;

    let ready = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Stream the video (the browser fetches byte ranges as you scrub, so it works before the
    // whole file has arrived). Phones and data-saver mode get the lighter 540p file.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const small = window.matchMedia("(max-width: 767px)").matches || conn?.saveData === true;
    const src = small ? hotel.heroVideoMobile : hotel.heroVideo;
    v.src = src;
    v.load();

    // Flaky mobile networks drop downloads: retry a few times, backing off.
    const onError = () => {
      if (retries >= 4) return;
      retries += 1;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        const t = v.currentTime;
        v.src = `${src}?r=${retries}`;
        v.load();
        v.currentTime = t;
      }, 1500 * retries);
    };
    v.addEventListener("error", onError);

    const onMeta = () => {
      ready = true;
      // iOS Safari only paints seeked frames after the video has been "played" once.
      v.play().then(() => v.pause()).catch(() => {});
    };
    const ctx = backdrop.current?.getContext("2d");
    const paintBackdrop = () => {
      if (ctx && v.readyState >= 2) ctx.drawImage(v, 0, 0, 36, 64);
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("seeked", paintBackdrop);
    v.addEventListener("loadeddata", paintBackdrop);

    let current = 0;
    let px = 0;
    let py = 0;
    let lastActive = -1;
    let raf = 0;
    const onPointer = (e: PointerEvent) => {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const loop = () => {
      const r = sec.getBoundingClientRect();
      const target = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      current += (target - current) * 0.14;
      const p = current;

      // 1. scrub the video (skip while a seek is still in flight, so seeks never queue up)
      if (ready && !v.seeking && v.duration) {
        const t = p * (v.duration - 0.04);
        if (Math.abs(v.currentTime - t) > 1 / 60) v.currentTime = t;
      }

      // 2. 3D card: tilts back at the start, settles flat, sways gently, then lifts away at the end
      const desk = window.innerWidth >= 768;
      if (card.current) {
        if (desk) {
          const settle = ease(clamp(p / 0.1));
          const out = ease(clamp((p - 0.9) / 0.1));
          const rx = (1 - settle) * 16 + py * -4;
          const ry = (1 - settle) * -12 + Math.sin(p * Math.PI * 3) * 5 + px * 6;
          const s = 0.9 + settle * 0.1 + out * 0.15;
          card.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
          card.current.style.opacity = String(1 - out);
        } else {
          const out = ease(clamp((p - 0.92) / 0.08));
          card.current.style.transform = `scale(${1 + p * 0.06})`;
          card.current.style.opacity = String(1 - out * 0.9);
        }
      }

      // 3. chapters
      let a = 0;
      heroChapters.forEach((c, i) => {
        const el = chapterEls.current[i];
        const alpha = chapterAlpha(p, c.from, c.to, i === 0);
        if (alpha > 0.5) a = i;
        if (el) {
          el.style.opacity = String(alpha);
          el.style.transform = `translate3d(0, ${(1 - alpha) * 24}px, 0)`;
          el.style.visibility = alpha < 0.01 ? "hidden" : "visible";
        }
      });
      if (a !== lastActive) {
        lastActive = a;
        setActive(a);
      }
      if (railFill.current) railFill.current.style.transform = `scaleY(${p})`;
      if (cue.current) cue.current.style.opacity = String(clamp(1 - p * 25));

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(retryTimer);
      window.removeEventListener("pointermove", onPointer);
      v.removeEventListener("error", onError);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("seeked", paintBackdrop);
      v.removeEventListener("loadeddata", paintBackdrop);
    };
  }, []);

  return (
    <section id="top" ref={section} className="relative h-[420vh] bg-ink">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* blurred copy of the current frame, fills the sides on wide screens */}
        <canvas ref={backdrop} width={36} height={64} className="hero-backdrop" aria-hidden />
        <div className="absolute inset-0 bg-ink/55" />

        <div className="hero-stage">
          <div ref={card} className="hero-card">
            <video
              ref={video}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="auto"
              poster={hotel.heroPoster}
              aria-label="Walk-through of Hotel Teesta: street, restaurant, lobby and rooms"
            />
            <div className="hero-card-shade" />
          </div>
        </div>

        {/* chapters */}
        <div className="hero-chapters">
          {heroChapters.map((c, i) => (
            <div
              key={c.key}
              ref={(el) => {
                chapterEls.current[i] = el;
              }}
              className="hero-chapter"
              style={i === 0 ? undefined : { opacity: 0, visibility: "hidden" }}
            >
              {i === 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/mainali-logo-intro-dark.svg" alt="Mainali Hospitality" className="mb-5 w-36 md:w-44" width={240} height={122} />
              )}
              {i === 0 ? (
                <h1 className="hero-title hero-title-in">{c.title}</h1>
              ) : (
                <h2 className="hero-title">{c.title}</h2>
              )}
              <p className="hero-sub">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* chapter rail (desktop) */}
        <nav className="hero-rail" aria-label="Video chapters">
          <div className="hero-rail-track">
            <div ref={railFill} className="hero-rail-fill" />
          </div>
          <ol>
            {heroChapters.map((c, i) => (
              <li key={c.key} data-active={i === active}>
                <span>0{i + 1}</span> {c.label}
              </li>
            ))}
          </ol>
        </nav>

        <div ref={cue} className="hero-cue" aria-hidden>
          <span>Scroll</span>
          <i />
        </div>
      </div>
    </section>
  );
}
