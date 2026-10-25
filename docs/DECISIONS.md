# Decisions log

Newest first. Each entry: what was decided, why, and what's still open.

---

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
