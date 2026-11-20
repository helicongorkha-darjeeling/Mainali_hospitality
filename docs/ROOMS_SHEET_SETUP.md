# Rooms in the leads sheet: setup and daily use

One Google Sheet (the leads sheet, script project "Teesta_hotel_leads") holds everything:

| Tab | Who fills it | What it is |
|---|---|---|
| **Leads** | the website (via Supabase) | visitors who left a phone number; column P shows the rooms free for their dates |
| **Bookings** | **the front desk** (and the website's "WEB" rows) | one row per booking, the same columns as the old daily register |
| **Rooms** | the script | next 60 days × 25 rooms: guest names, green = free, free rooms per type each night |
| **Day** | the script | Check-out / In-house / Arrivals for the date in B1, like the old daily tabs |

Script: `google/hotel-sheet.gs` (it replaces the old leads-sheet and room-chart scripts).

## Setup (once, about 10 minutes)

1. **Import the November bookings.** Open the leads sheet → **File → Import → Upload** →
   `Bookings-import-November.xlsx` → Import location: **Insert new sheet(s)** → **Import data**.
   A tab called **Bookings** appears. (If a tab with that name already exists, delete it first.)
2. **Paste the script.** **Extensions → Apps Script**. In `Code.gs`, copy your existing `const SECRET = "…";` line,
   select all, paste `hotel-sheet.gs`, and put your SECRET line back in place of `const SECRET = "PASTE_SECRET_HERE";`.
   Keep `ALERT_TO` as you had it. Save (Cmd+S).
3. **Run setup.** Choose **setup** in the function list at the top → **Run** → allow the permissions
   (Advanced → Go to … (unsafe) → Allow). It makes the Rooms and Day tabs and an hourly refresh.
4. **Update the web app.** **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**
   Never "New deployment": that changes the web address.
5. Reload the sheet. A **Teesta** menu appears (Refresh free rooms now · Set up).

## Daily use for the front desk

- **New booking:** add a row in **Bookings**. Fill at least GUEST NAME, C/IN, C/OUT, ROOM NO.
  - ROOM NO: room numbers separated by `/`, e.g. `306/307`. A booking with no room number ("8 ROOMS") does **not**
    block rooms: the CHECK column says so.
  - C/OUT is the day they leave. C/IN 20 Nov, C/OUT 22 Nov = nights of 20 and 21 Nov.
- **Guest arrives / leaves:** set STATUS to `C/IN` / `C/OUT`. **Left early or moved room?** Change C/OUT or ROOM NO
  on that row (don't add a second row for the same stay).
- **Cancelled / no-show:** STATUS `CANCEL` or `NO SHOW`. The rooms become free at once.
- **CHECK column** (last): `OK`, `past`, or a problem in red (a clash with another row, a missing date or room).
  Fix red rows: a clash means two bookings hold the same room on the same night.
- **Rooms tab:** how many rooms are free each night, per type, and which. It updates by itself after every edit
  in Bookings, and every hour.
- **Day tab:** type a date in **B1** to see that day's check-outs, in-house guests and arrivals.

## Website bookings

- At payment the website adds a row: STATUS `WEB HOLD` (amber), with the rooms held for 30 minutes.
- When the guest says they've paid: `WEB VERIFY PAY` (green), PAYMENT shows the amount, e.g. `₹3116 UPI · VERIFY`.
  Check the ICICI app, then change STATUS to `WEB PAID` (or `CANCEL` if no payment came).
- Holds nobody paid for become `WEB EXPIRED` and free the rooms.
- The website never sells a room that Bookings shows as taken. Sold-out types are greyed out for those dates.

## Room types (from the register)

| Type | Rooms |
|---|---|
| Double (The King) | 301 302 303 305 310 311 313 314 319 320 321 322 |
| Triple | 312 315 318 323 325 |
| 4-bed (The Quad) | 304 306 307 308 309 316 317 |
| Big room (Large Family Room) | 324 |

Change a room's type in both `ROOM_TYPES` (`google/hotel-sheet.gs`) and `roomInventory` (`src/content/site.ts`).
