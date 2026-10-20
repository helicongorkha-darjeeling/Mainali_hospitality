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
2. **Hero**: the hotel walk-through video plays forward only while you scroll (scroll-scrubbed) and pauses when you stop. On desktop it sits in a 3D card over a blurred copy of itself, with a chapter rail; on phones it fills the screen. Chapters: *"Welcome. Where Darjeeling begins."* → *"Food. Expert chef. Room service or restaurant."* → *"Information desk. Book trending tours at the desk."* (plus airport/station pickups) → *"Rest. Warm escapes for chilly nights."*
3. **Rooms**: a 3D carousel of the four room types (front card faces you, the rest fan out in depth); advances as you scroll and can be dragged. Heading *"Stay your way."*
   - **The King**: single/double occupancy, double bed (12 rooms; TV in 305, 313, 314)
   - **The Triple**: 3 beds (6 rooms; TV in 304, 306, 312)
   - **The Quad**: 4 beds, TV (6 rooms)
   - **Large Family Room**: suite, 6 beds, or a group room (1 room: 324)
   The full 25-room list from the daily booking room chart is in `roomInventory` (`site.ts`).
4. **Dining**: restaurant photos on cards that tilt in 3D under the cursor. Heading *"Eat in."*
5. **Experiences**: tour packages with a car and driver. The lobby tour-wall photo sits beside a numbered list of tours (stops, duration, price); each one opens a pre-filled WhatsApp enquiry. Heading *"Go further."*
6. **Gallery**: a WebGL fly-through where photos float in depth and the camera moves forward as you scroll. Heading *"Take a look."*, ending on *"See you soon. Waiting to serve."*
7. **Find us**: map, address, phones, *Call the front desk* and *Get directions* buttons. Heading *"Find us. Just 50 seconds from the bus stand."*
8. **Footer**: logo, contacts, © line.

**Book now** button: fixed in the exact centre of the screen on every device and never moves. Transparent with a thin border at rest; turns gold on hover or focus. Over light sections it switches to dark text. It opens a booking sheet (dates, guests, room type) that currently sends a pre-filled WhatsApp message.

Performance and accessibility:
- The 3D gallery loads lazily, pauses off screen, and caps the device pixel ratio at 1.75.
- The hero video (4.8 MB, 720p, keyframe every 5 frames) is loaded into memory so seeking is instant.
- `prefers-reduced-motion` turns off smooth scroll and decorative animation.
- Images go through `next/image` (AVIF/WebP, responsive sizes).
- Targets: Lighthouse ≥ 90 on mobile, LCP under 2.5 s.

## 3b. Booking flow (built, phase 1)

1. **Book Now form**: today / tomorrow by default; the guest count picks the best rooms (fewest rooms, then lowest price); name + phone; **Book** opens `/book`. Name and phone travel in sessionStorage, never in the URL.
2. **/book, Rooms & meals**: every room type with its *Jackpot deal* price (direct vs published rate, % off, taxes per night), steppers capped by the 25-room inventory, meal plans EP (default) / CP +₹250 / MAP +₹500 / AP +₹750 per guest per night.
3. **Review**: itinerary ticket (check-in 12 PM, check-out 11 AM), room features, front-desk tour perk, cancellation timeline, guest details with browser autofill (`autocomplete="name|tel|email"`), terms checkbox.
4. **Payment**: UPI to the hotel's ICICI eazypay merchant account. Phones: Pay now opens the UPI apps (Google Pay, PhonePe, Paytm buttons too) with an optional QR; computers: QR with the amount filled in. UPI reference (UTR) optional.
5. **Confirmation**: booking ID; the guest sends the booking to the hotel on WhatsApp or email.

Settings live in `src/content/booking.ts` (rates, meal plans, GST tiers, stay times, cancellation rules, UPI ID, amenities). Policies: `/policies/booking-terms`, `/policies/cancellation`, `/policies/privacy` (`src/content/policies.ts`).

Phase 2 replaces the manual parts: live availability + holds, payment gateway with automatic confirmation (Razorpay / PhonePe PG / Cashfree), bookings saved to Supabase, confirmation emails. The Kiran project (`Clients/Kiran`) already has a Supabase booking backend with holds and Google sign-in that can be adapted.

## 4. Phase 2: Supabase

Tables:
- `rooms` (id, slug, name, occupancy, beds, max_guests, price_from, images[], sort): the four room types
- `room_units` (no, room_slug, tv, floor, active): the 25 physical rooms (seed from `roomInventory`)
- `gallery` (id, image_path, alt, category, sort)
- `booking_requests` (id, created_at, name, phone, email, check_in, check_out, guests, room_slug, source [web/whatsapp/email/agent], status)
- `room_assignments` (booking_id, room_no, date): which physical room a confirmed booking gets each night (replaces the paper daily chart)
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
- [x] Room types (King, Triple, Quad, Large Family Room) and the 25-room chart
- [ ] Confirm prices per room type (placeholders except The King: ₹1,868 direct / ₹4,399 published)
- [ ] Meal plan pricing: per guest per night (as built) or per room?
- [ ] GST rates with the accountant (built: 5% rooms ≤ ₹7,500/night, 5% meals)
- [ ] Approve the cancellation schedule (draft: full refund ≥48 h, 50% 24–48 h, none <24 h)
- [x] Merchant UPI: ICICI eazypay 7430838048.eazypay@icici (registered as HOTEL SAGARMATHA)
- [ ] Confirm guests should pay to the HOTEL SAGARMATHA merchant account, or get a Hotel Teesta merchant QR
- [ ] Ask ICICI to change the merchant category (mc) from 5172 (petroleum) to 7011 (hotels)
- [ ] Payment gateway for Visa/Mastercard cards, wallets and netbanking (Razorpay / Cashfree / PayU), with automatic payment confirmation
- [ ] Check-in 12 PM / check-out 11 AM (from the OTA listing)
- [ ] What "CP" means on room CP318
- [x] Reservations email: reservations@mainalihospitality.com
- [ ] Domain name.
