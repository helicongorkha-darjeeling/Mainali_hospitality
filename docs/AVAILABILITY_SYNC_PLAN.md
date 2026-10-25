# Room chart ↔ website: availability and booking sync

## What the hotel uses today (`BOOKING TEESTA HOTEL.xlsx`)

- **One tab per month.** The grid has **dates down column A** and **rooms 301–325 across** (B–Z).
- **A filled cell = that room is booked that night.** The text is free-form: agent or guest name, guest count, plan (AP/CP), phone, payment ("PAID", "DUE 5000", "ONLINE", "CASH", advance). The **cell colour groups** one booking across rooms and nights.
- A multi-night stay is the **same text repeated** down the rows. Group bookings fill many rooms.
- Most bookings come from **travel agents** (Flying, Bengal Safari, Om Tour, Watch India, A2Z, Hill Touch…).
- Quirks the sync must handle:
  - The tab named "SEPTEMBER" actually holds June 2025 – Sept 2026 history (448 days, about 7,500 booked cells).
  - Tab names have no year, and November's dates start at row 6, not row 3.
  - Some cancellations stay in the cell as "CANCEL …".
  - About 490 cells are coloured but empty.
- **Room types to confirm:** the old tab says 307 and 315 are 3-bed. The daily room chart (and the website) says 4-bed.

## Rules the sync uses (to agree with the front desk)

| In the chart | Means |
|---|---|
| Empty cell | Free that night |
| Any text | Booked |
| Text starting with "CANCEL" | Free (or simply clear the cell) |
| Coloured but empty | **Booked** (the safe choice, so the website never oversells) |
| Amber, starting "WEB HOLD" | A website guest is paying. Freed automatically after 30 minutes if unpaid |
| Light green, starting "WEB" | Booked on the website, payment to verify (written automatically) |
| A date typed as text or out of order | Skipped. If that leaves a night missing in a month the chart has, the website doesn't sell that night |

Night = check-in date. A stay of 25–27 Oct books the rows for 25 and 26 Oct.

---

## Option A: the Google Sheet chart is the master (free, simplest) ★ recommended first

The front desk keeps the **same chart**, converted to Google Sheets. The website reads availability from it and writes website bookings into it. There's one source of truth, so nothing can drift.

```
Desk types in chart ─┐
                     ├─► Google Sheet chart (master) ◄── Apps Script "chart API" (in the sheet)
Website booking  ────┘          ▲                              ▲
                                └── /api/availability (cached 60 s) ──┘
                                └── /api/bookings: hold at payment → confirm when paid
```

- **Availability:** the website asks "how many rooms of each type are free on every night of this stay". The website shows "Only 2 left" or "Sold out", greys out full room types and never lets the guest pick more than is free.
- **Hold:** when the guest reaches payment, the script takes a lock and **re-checks** the cells. It picks the **same room for every night** (lowest free number of that type) and writes `WEB HOLD · TST-… · Mr X · 2 pax · CP · 98xxxxxxx` in amber. If the type was taken in the meantime, the guest sees "just sold out" and the page re-picks from what's left. Unpaid holds are freed after 30 minutes.
- **Confirm:** when the guest says they've paid, the cells turn light green: `WEB · TST-… · … · VERIFY PAY`. The room numbers also go to the leads sheet ("2 × The King · rooms 301, 302"). If the hold had run out and the room is gone, the guest is told the desk will call, and the lead says "NO ROOM IN CHART, call guest".
- **Verify tick → PAID:** when the desk ticks Verified in the leads sheet, the cell text changes to `… PAID`.
- **Cancel:** the desk clears the cells (or the website clears them for a booking ID).
- **Extras in the sheet:** a menu "Teesta → Add next month" creates a correctly laid-out month tab with the dates and room columns.
- **Cost: ₹0.** Google Sheets and Apps Script are free.
- **Watch-outs:**
  - Each script call takes 1–3 seconds, so availability is cached for about 60 seconds.
  - Desk edits and website writes in the same second could clash. This is rare, and the re-check catches it.
  - The desk must work in the Google Sheet, not the Excel file on the PC. Excel can still open a download.

## Option B: Supabase is the master, the chart is a live two-way mirror (free, sturdier)

Supabase keeps a `room_nights` table (room, night, label, source, booking ID). The **database guarantees one booking per room per night**, so double booking is impossible.

```
Website booking ──► Supabase room_nights (master) ──trigger──► writes the cell in the chart
Desk edits cell ──► Apps Script onEdit ──► Supabase (upsert / delete room_night)
Hourly job ──► full re-sync of visible months (repairs any missed edit)
```

- **Website availability comes straight from Supabase**: instant, no waiting on Apps Script.
- **The desk still sees and edits the same grid.** Their edits flow back within seconds.
- **Initial import:** the current and future months are loaded into Supabase once.
- **Cost: ₹0** on free tiers.
- **Watch-outs:**
  - Two-way sync has more moving parts. Pasted ranges, inserted rows and renamed tabs need handling.
  - The hourly re-sync is the safety net.
  - An edit made while Google is unreachable shows up at the next re-sync.

## Option C: a hotel PMS / channel manager (paid monthly)

Examples: eZee Absolute, Hotelogix, Djubo, STAAH, AxisRooms, Cloudbeds. You get a front-desk calendar app, a booking engine, GST invoices, reports and **automatic sync with OTAs** (MakeMyTrip, Goibibo, Booking.com, Agoda, Cleartrip). The website either uses the PMS booking engine or API, or links to it.

- **Cost:** a monthly subscription, usually a few thousand ₹ a month depending on rooms and modules. Check current prices.
- **Pros:** it removes the biggest double-booking risk, which is OTA bookings that aren't typed into the chart yet.
- **Cons:** monthly cost, staff training, and the Excel chart habit goes away.

## Small paid upgrades (any option)

| Upgrade | Why |
|---|---|
| Vercel Pro | Required for a commercial site; also more server time |
| Google Workspace (hotel domain) | Hotel-owned accounts and email, higher Apps Script limits, files owned by the business |
| Supabase Pro | No pausing, daily backups (Option B relies on it more) |

---

## Recommendation

1. **Start with Option A.** It keeps the desk's habit and has one source of truth, at ₹0.
2. **Move to Option B** if the sheet gets slow, or the website needs instant availability at busy times.
3. **Move to Option C** when OTA volume makes hand-typing OTA bookings into the chart a source of double bookings.

## Option A: status

### Built (2026-10-25)
- **Chart script** `google/room-chart.gs`: availability, hold and confirm, auto-release of unpaid holds, and the menu **Teesta → Add next month**. When a booking lands in a month with no tab yet, it fills an empty tab named for that month (e.g. "December") or adds "DECEMBER 2026". It is tested on a copy of the real chart (34 checks), including a stay across two month tabs, a desk edit racing the website, sold out, CANCEL, coloured-empty cells and the typos below.
- **Website:** `/api/availability` (cached 60 s at the CDN) and `/api/bookings` (hold, confirm). The booking page shows "Only X left" or "Sold out", caps rooms at what's free, says "held for you for 30 minutes", and recovers from "just sold out".
- **Until `CHART_API_URL` and `CHART_API_SECRET` are set in Vercel, the site books exactly as before.**

### Go live (owner)
1. Upload the `.xlsx` to the hotel Google account's Drive, open it, then **File → Save as Google Sheets**. From then on the desk works in that file only.
2. Fix these typos in the chart:
   - OCTOBER: "29-0CT" (a zero instead of the letter O) is text, so 29 Oct isn't read. Retype it as a date. Until it's fixed, the website won't sell 29 Oct.
   - The history tab ("SEPTEMBER") has 1–12 Sept 2026 typed day/month swapped (they read as 9 Jan … 9 Dec 2026) and 19–31 July 2026 typed as 2002. The script skips these rows, so fixing them is only for the record.
3. In the chart: **Extensions → Apps Script**. Paste `google/room-chart.local.gs` (it has the secret) and save. **Deploy → New deployment → Web app**. Execute as: Me. Who has access: Anyone. Send the /exec URL.
4. Reload the chart, then click **Teesta → Turn on auto-release of holds**.
5. Vercel env vars: `CHART_API_URL` (the /exec URL) and `CHART_API_SECRET` (the secret is in `website/.env.local`), then redeploy.
6. Test on a **copy** of the chart first, then point the URL at the real chart.
7. Agree the conventions above with the desk: one cell = one room-night, clear or "CANCEL" to free a room, no coloured empty cells, real dates in column A, and new months via **Teesta → Add next month**.

### Still open
- **Room types 307 and 315:** the chart header says 3-bed, while the room chart and the website say 4-bed. Update `roomInventory` (`src/content/site.ts`) and `ROOM_TYPES` (`google/room-chart.gs`) together.
- **Leads sheet Verified tick → chart cell "PAID" → PAID voucher email.**
