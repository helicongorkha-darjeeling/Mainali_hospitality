# Hotel Teesta, Darjeeling: website implementation plan

Client: Hotel Teesta & Restaurant (Mainali Hospitality), Bus Stand, Darjeeling.
Goal: a fast, cinematic, 3D‑feeling website with one job: get the guest to **Book now**.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Made by Vercel, so it deploys with no setup. Server components keep the page light, and API routes give a place for booking logic later. |
| Styling | **Tailwind CSS v4** | Design tokens live in one CSS file. No runtime cost. |
| 3D | **React Three Fiber + drei (Three.js)** | Real WebGL scenes written as React components. Loaded on the client only and lazily, so the first paint stays fast. |
| Motion | **GSAP + ScrollTrigger**, **Lenis** smooth scroll | Scroll‑driven 3D and reveal animations. GSAP is free for commercial use. |
| Data (phase 2) | **Supabase** (Postgres, Storage, Auth) | Rooms, prices, gallery and booking requests. The site already reads content from one module (`src/content/site.ts`), so swapping to Supabase only touches that module. |
| Hosting | **GitHub → Vercel** | Every push to `main` deploys; every PR gets a preview URL. |

## 2. Repository layout

The Git repo is the `website/` folder. The original source files (`Images_webp/`, `Logos/`, `Hero_video/`) stay outside the repo, one level up.

```
website/                        ← Git repo, deployed by Vercel
├── docs/IMPLEMENTATION_PLAN.md ← this file
├── public/
│   ├── images/                 ← renamed copies of the photos (no spaces)
│   ├── textures/               ← small copies for WebGL
│   ├── brand/                  ← logo SVGs
│   └── video/                  ← hero.mp4 + hero-poster.webp (scroll-scrub encoded)
├── scripts/                    ← encode-hero.mjs, make-textures.mjs
└── src/
    ├── app/                    ← layout, page, globals.css, icon.svg
    ├── components/             ← Navbar, Hero, Rooms, Dining, Experiences, Gallery, Location, Footer, BookNow…
    ├── components/three/       ← R3F gallery fly-through
    ├── content/site.ts         ← all copy, rooms, tours, contacts (moves to Supabase later)
    └── lib/booking.ts          ← booking + tour enquiry (WhatsApp today, Supabase later)
```

## 3. Landing page (phase 1, built)

Copy rule: headings of 1–4 words, subheadings of one short line.

1. **Navbar**: transparent over the hero, turns frosted-glass after scrolling. Logo on the left (gold knot turns on hover), 5 links (Rooms · Dining · Experiences · Gallery · Find us), and a call button. Hamburger menu on mobile.
2. **Hero**: the hotel walk-through video plays forward only while you scroll (scroll-scrubbed) and pauses when you stop. On desktop it sits in a 3D card over a blurred copy of itself, with a chapter rail; on phones it fills the screen. Chapters: *"Above the clouds."* → *"Eat."* → *"Explore."* → *"Rest."*
3. **Rooms**: a 3D ring of room cards that turns as you scroll and can be dragged. Heading *"Rest well."*
4. **Dining**: restaurant photos on cards that tilt in 3D under the cursor. Heading *"Eat in."*
5. **Experiences**: tour packages with a car and driver. The lobby tour-wall photo sits beside a numbered list of tours (stops, duration, price); each one opens a pre-filled WhatsApp enquiry. Heading *"Go further."*
6. **Gallery**: a WebGL fly-through where photos float in depth and the camera moves forward as you scroll. Heading *"Take a look."*
7. **Find us**: map, address, phone, WhatsApp. Heading *"At the bus stand."*
8. **Footer**: logo, contacts, © line.

**Book now** button: fixed in the exact centre of the screen on every device and never moves. Transparent with a thin border at rest; turns gold on hover or focus. Over light sections it switches to dark text. It opens a booking sheet (dates, guests, room type) that currently sends a pre-filled WhatsApp message.

Performance and accessibility:
- The 3D gallery loads lazily, pauses off screen, and caps the device pixel ratio at 1.75.
- The hero video (4.8 MB, 720p, keyframe every 5 frames) is loaded into memory so seeking is instant.
- `prefers-reduced-motion` turns off smooth scroll and decorative animation.
- Images go through `next/image` (AVIF/WebP, responsive sizes).
- Targets: Lighthouse ≥ 90 on mobile, LCP under 2.5 s.

## 4. Phase 2: Supabase

Tables:
- `rooms` (id, slug, name, beds, max_guests, price_from, images[], sort)
- `gallery` (id, image_path, alt, category, sort)
- `booking_requests` (id, created_at, name, phone, email, check_in, check_out, guests, room_slug, status)
- `tours` (id, slug, name, line, stops[], duration, price_from, image_path, active, sort)
- `vehicles` (id, name, seats, price_per_day, image_path): the car options offered with tours
- `drivers` (id, name, phone, languages[], active): staff only, never public
- `tour_requests` (id, created_at, tour_slug, vehicle_id, date, people, name, phone, status)
- `site_settings` (key, value): phone, WhatsApp, address, hero video URL

Steps:
1. Create a Supabase project and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel env vars.
2. Turn on Row Level Security: anonymous users can read `rooms` and `gallery` and insert into `booking_requests`. Only staff can read bookings.
3. Replace the static exports in `src/content/site.ts` with server fetches (ISR, revalidate every 60 s).
4. Change `lib/booking.ts` to insert into `booking_requests` through a server action, then email or WhatsApp the hotel.
5. Move photos and video to Supabase Storage (or keep them in `/public`).
6. Later: a small staff dashboard (Supabase Auth) to confirm bookings.

## 5. GitHub → Vercel deploy

```bash
cd website
git remote add origin https://github.com/helicongorkha-darjeeling/Mainali_hospitality.git
git push -u origin main
```
Then on vercel.com: **Add New → Project → import `Mainali_hospitality`**. The framework preset is detected as Next.js, so no settings are needed. Add a custom domain under Project → Domains.

## 6. Still needed from the client

- [x] Hero video (Video Project 14, trimmed to 13.3 s)
- [ ] Tour durations, prices per car, and car types
- [ ] Confirm the hotel offers the tours listed (taken from the lobby tour wall)
- [ ] Confirm phone and WhatsApp numbers (read from the signage: 98327 19783 / 62945 63420).
- [ ] Exact address and Google Maps pin.
- [ ] Room types and starting prices.
- [ ] Domain name.
