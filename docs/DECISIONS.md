# Decisions log

Newest first. Each entry: what was decided, why, and what's still open.

---

## 2026-11-10: security review, and what changed

A review of the site, the database function and the two Apps Scripts found ten things. Eight are fixed in code; the rest need the owner (list at the end).

**Leads go through the website's server.** The browser used to call the database function `capture_lead` itself, with the public key. So anyone could call it too, with any name, any rooms and any total, as often as they liked. Now the browser posts to `/api/leads`, and the server checks the request, limits how often one address can post, and writes the row.

**The total the desk sees is worked out on the server**, from the rooms, guests, nights and meal plan, with the same `quote()` the page uses. The desk checks payments against that number, so it can't be one the guest's browser sends. The chart cell carries it too: `WEB · TST-… · Asha Rai · 2 pax · CP · +9198… · ₹4,123 · VERIFY PAY`.

**Nothing a visitor types can become a formula in the sheets.** A name like `=IMPORTDATA(…)` used to land in the Leads sheet as a live formula, which can send the sheet's contents to another site. It is now stopped in three places: `capture_lead` strips leading `= + - @`, the Leads script writes text as text, and the chart label keeps only letters in the name and digits in the phone.

**Booking requests are checked on the server** (`src/lib/api.ts`). The page offers nothing outside these, so a real guest never meets them:

| Limit | Value | Where to change it |
|---|---|---|
| Guests per booking | 20 | `bookingLimits` in `src/content/booking.ts` |
| Nights per booking | 30 | same |
| How far ahead | 365 days | same |
| Rooms per booking | no more rooms than guests, and enough beds for everyone | `src/app/api/bookings/route.ts` |
| Website room-nights written to the chart per day | 150 | `DAILY_WEB_ROOM_NIGHTS` in `google/room-chart.gs` |
| New leads | 100 per 10 minutes, all visitors together | `capture_lead` (migration `20261110090000`) |
| Requests from one address in 10 minutes | 12 bookings, 120 leads, 120 availability | the route files |

Before this, one request could mark all 25 rooms booked for 30 nights with no hold and no payment, and repeat it for every month. Larger groups and longer stays go through the front desk, as the page says.

**If the chart is connected but doesn't answer, the guest is not asked to pay.** They see "We couldn't hold your rooms just now" with a WhatsApp link, and the desk already has their number in the Leads sheet. Before, the site took payment with no room held. To go back to that, set `payWithoutHold = true` in `src/content/booking.ts`. With no chart connected at all, the site books as before.

**Headers.** A Content-Security-Policy and a Permissions-Policy (`next.config.ts`). The page may only load its own files and the Google map, and may only send data to its own server. A new third-party service (analytics, a payment gateway, a chat widget) must be added there or the browser will block it.

**Scripts.** Both Apps Scripts refuse to run with the secret still set to `PASTE_SECRET_HERE`, and the chart script no longer sends its error text back to the website (it's in the Apps Script log: Executions).

**What this does not fix.** There is no payment gateway, so "I've paid" is still the guest's word, and the desk must check every payment in the bank app before confirming (the cell says VERIFY PAY for that reason). Someone determined can still block up to 150 room-nights a day in the chart, 12 requests at a time; the desk would see it and can clear the cells. The request limits are counted per server copy, so they slow one address down rather than stop a wide attack; a Vercel Firewall rate-limit rule on `/api/*` is the stronger version.

**Open (owner):**
1. Run `supabase/migrations/20261110090000_capture_lead_hardening.sql` in the Supabase SQL editor.
2. Paste the new `google/leads-sheet.gs` into the Leads sheet's script (keep the same secret) and deploy a **new version** of the same deployment, so the URL doesn't change.
3. When the chart is connected, use the new `google/room-chart.gs`.
4. Create a Supabase secret key, add it to Vercel as `SUPABASE_SECRET_KEY`, redeploy, open `/api/leads` and check it says `"serverKey":"working"`. Then run `supabase/manual/lock_down_capture_lead.sql`. From then on only the website's server can write leads. Until this is done, the database function can still be called directly, but it now cleans what it stores and caps how many rows can be added.
5. Email: turn on DKIM for the domain, then move DMARC from `p=none` to `quarantine`, later `reject`.
6. GitHub: protect `main` (no force pushes, no deletion).
7. Decide how long to keep leads that never became bookings. Nothing deletes them today; the privacy policy promises deletion once they're no longer needed.

## 2026-10-25: the booking chart is the master for rooms (Option A)

**Decision:** the front desk's booking chart, converted to Google Sheets, is the one source of truth for which rooms are free. The website reads availability from it and writes its own bookings into it through an Apps Script web app inside the chart (`google/room-chart.gs`). See `AVAILABILITY_SYNC_PLAN.md`.

**How:** at payment, the rooms are held in amber for 30 minutes (same room every night). When the guest says they've paid, the cells turn green "VERIFY PAY". Unpaid holds free themselves. The website only touches cells starting "WEB". Anything unclear in the chart (coloured empty cells, a night missing from a month) counts as booked, so the website never oversells.

**Security:** a shared secret in Vercel (`CHART_API_SECRET`) and in the script. The ready-to-paste script is `google/room-chart.local.gs` (git-ignored). The secret is never put in a URL.

**Until connected:** without `CHART_API_URL` and `CHART_API_SECRET` the site books as before.

**Open:** convert the chart and fix two typos, deploy the script, set the Vercel env vars, confirm room types 307 and 315.

## 2026-10-25: live leads sync to Google Sheets

**Decision:** Supabase pushes every new or updated lead to the front desk sheet itself, using a database trigger (`pg_net`) that calls a Google Apps Script web app inside the sheet (`google/leads-sheet.gs`). This replaces the service-account idea for leads: there's no Google Cloud project, no website code and no Vercel secrets.

**Security:** a shared secret in Supabase Vault (`sheets_webhook_secret`) is checked by the script. The ready-to-paste script is `google/leads-sheet.local.gs` and is git-ignored. The front desk never gets Supabase access.

**Sheet:** tab "Leads", one row per visitor, updated as they move from left number → choosing rooms → reviewing → at payment → says paid. The desk-only columns "Called?" and "Desk notes" are never overwritten.

## 2026-10-18: payee name must be "Hotel Teesta"

**Decision:** guests must see **Hotel Teesta** as the payee everywhere, including inside Google Pay and PhonePe. "Hotel Sagarmatha" must not appear.

**Constraint:** for a merchant UPI ID, UPI apps show the name the **bank registered** for it. The name the website sends (`pn`) doesn't override it. The current QR (`7430838048.eazypay@icici`) is registered to **HOTEL SAGARMATHA**, so Google Pay will keep showing that name whatever the website does.

**Action (owner):** ask ICICI for an eazypay merchant QR / UPI ID **registered as Hotel Teesta**. Either:
- a new eazypay merchant for Hotel Teesta (needs Hotel Teesta's business KYC and account), or
- a change of the display name (trade name) on the existing merchant, if Hotel Teesta is a trade name of the same business.

Also ask ICICI to set the merchant category to **7011 (hotels)**. The current QR has 5172 (petroleum).

**Then (code, a few minutes):** decode the new QR and update `upi` in `src/content/booking.ts`. Run the QR round-trip check, then push.

**Until then:** decide between keeping online UPI to the Sagarmatha account (guests see that name) and pausing online payment ("Reserve now, pay at the hotel").

## 2026-10-18: launch without a payment gateway

**Decision:** no Razorpay or other gateway at launch.

**How payments are confirmed:** the guest pays by UPI to the merchant QR, then the booking lands in the Google Sheet as **To verify**. The front desk checks the ICICI eazypay app or SMS (by amount and the note "Hotel Teesta booking TST-…") and ticks **Verified**. That sends the PAID voucher. A gateway later makes the tick automatic. See `PAYMENTS_AND_FRONT_DESK_PLAN.md` §0.

## 2026-10-18: front desk uses Google Sheets

**Decision:** Google Sheets ("Hotel Teesta Bookings"), written by the website server through a Google service account.

**Why:** it's free, updates within seconds, opens on any device and exports to Excel. Staff never get Supabase access.

**Open:** the hotel Google account, the Cloud project and service account, staff emails.

## 2026-10-18: no Claude attribution in the repo

Commits are authored by the owner only, with no co-author lines.

## Working rule

Push to `main` only when code or the live site changes. Decision notes like these go up with the next code push.
