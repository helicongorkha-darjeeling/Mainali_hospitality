# Decisions log

Newest first. Each entry: what was decided, why, and what's still open.

---

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

Every change, including brainstorming outcomes like these entries, is committed and pushed to `main` straight away.
