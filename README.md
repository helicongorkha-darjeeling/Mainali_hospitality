# Hotel Teesta · Darjeeling

Landing page for Hotel Teesta (Mainali Hospitality). Built with Next.js, Tailwind v4, React Three Fiber, GSAP and Lenis.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Where things live

| What | File |
|---|---|
| All copy, rooms, phones, address | `src/content/site.ts` |
| Booking (WhatsApp now, Supabase later) | `src/lib/booking.ts` |
| Book Now (fixed, screen centre) | `src/components/BookNow.tsx` + `.bn-*` in `src/app/globals.css` |
| Scroll-scrubbed hero video + chapters | `src/components/Hero.tsx`, chapter text in `heroChapters` (`site.ts`) |
| Gallery fly-through | `src/components/three/GalleryScene.tsx` |
| Hero video | `public/video/hero.mp4` + `hero-poster.webp` |

New hero video: run `node scripts/encode-hero.mjs "path/to/video.mp4" 13.3` (the number is how many seconds to keep). It re-encodes the video so it scrubs smoothly and writes the poster frame. Then adjust the `from`/`to` values in `heroChapters` to match the new scenes.

New gallery photo: add it to `public/images`, run `node scripts/make-textures.mjs`, and list it in `gallery` in `src/content/site.ts`.

## Deploy

Push to GitHub, then import the repo on vercel.com. The Next.js preset is detected automatically.
