# Payments, vouchers and front desk: implementation plan

Goal: when a guest pays, the website knows within seconds, a **paid voucher** goes to the guest on WhatsApp and email, and the **front desk** sees the booking at once without new software or Supabase access.

---

## 0. Launch version: no payment gateway yet (UPI merchant QR)

The bank doesn't notify the website about UPI payments to the merchant QR, so the **front desk confirms each payment once**. Everything else is automatic.

1. The guest pays by UPI and returns, and the booking is saved as **To verify**. This already happens today as a lead at stage `booked`.
2. Straight away: a **row appears in the Google Sheet** (Status: To verify), the **desk gets an email**, and the **guest gets "Booking received, confirming your payment"**.
3. The desk checks the ICICI eazypay app or SMS for the amount and the note **"Hotel Teesta booking TST-…"**, then ticks **Verified** in the sheet.
4. The tick (via an Apps Script in the sheet) tells the website, which emails the guest the **PAID voucher PDF**, plus WhatsApp once the WhatsApp API is set up. The sheet then shows **Voucher sent**.

### Owner checklist (no gateway)
- [ ] Google: a hotel Gmail account, the sheet "Hotel Teesta Bookings", a Cloud project with the Sheets API and a service account, the sheet shared with it (Editor) and with staff
- [ ] Resend: account, `mainalihospitality.com` verified (DNS records), API key, a sender (e.g. `bookings@mainalihospitality.com`)
- [ ] Check that `reservations@mainalihotels.com` is a real inbox someone reads (replies go there)
- [ ] Front desk: their phone number, staff Google emails, and who checks the ICICI eazypay payments (app login or SMS alerts)
- [ ] Vercel: upgrade to Pro (commercial use); the owner adds the secrets as environment variables
- [ ] Optional, longer lead time: WhatsApp Business Platform (Meta verification, a number not already on WhatsApp, templates)
- [ ] Decisions: merchant name (Sagarmatha vs Teesta), room prices, cancellation schedule

Secrets (`GOOGLE_SERVICE_ACCOUNT_JSON`, `BOOKINGS_SHEET_ID`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DESK_WEBHOOK_SECRET`) go in Vercel → Settings → Environment Variables, and in `website/.env.local` for local testing. That file is git-ignored. Never commit them or paste them into chat.

When a gateway is added later, step 3 becomes automatic: its webhook ticks Verified, and the rest stays the same.

---

## 1. Front desk options

| Option | Cost | Live? | Desk needs | Verdict |
|---|---|---|---|---|
| **Google Sheets**, updated by our server | Free | Seconds | A browser or the Sheets app, plus a Google account (shared sheet) | **Recommended** |
| Excel Online (Microsoft 365), via Microsoft Graph | Microsoft 365 business plan (paid per user) plus an Azure app registration | Seconds | Microsoft account | Works, but more setup and a monthly cost |
| Excel file on the desk PC | Free | No (a website can't write to a file on a PC) | — | Not possible live |
| Supabase dashboard | Free | Live | A Supabase login | Rejected: the desk would get database access |
| Front desk page on the website (`/desk`, password) | Free | Live | Browser | Good later (check-in, room numbers) |
| Hotel software (PMS, channel manager) | Monthly fee | Live | Training | Later, if the hotel grows into it |

**Recommendation: Google Sheets.** It's free and opens on any phone or PC. It can be downloaded as `.xlsx` at any time, and Excel can open it too. Staff only get the sheet; they never see Supabase.

### How the sheet stays private and live

```
Gateway webhook → our server (Vercel) → Google Sheets API → "Hotel Teesta Bookings" sheet
                        │                    (service account; the key lives only on the server)
                        └→ Supabase (master copy; staff never get access)
```

- A free Google Cloud project with a **service account** (a robot Google identity). The sheet is shared with that robot's email as Editor.
- The robot's key is stored in **Vercel environment variables** and never reaches browsers.
- The owner shares the sheet with staff as needed. Protected ranges keep the booking columns read-only; only `Room no.` and `Desk notes` are editable.
- Supabase stays the master copy. If someone deletes a row, nothing is lost and the row can be re-sent.
- Alternative: a Google Apps Script `doPost` web app inside the sheet (also free, no Cloud project). It's less robust, because sheet editors can break the script.

### Sheet columns (one row per paid booking)

`Booking ID | Paid at | Guest | Phone | Email | Check-in | Check-out | Nights | Guests | Rooms | Meal plan | Total ₹ | Payment ref | Requests | Room no. (desk) | Desk notes (desk)`

Formatting: frozen header, today's arrivals highlighted, a "Today" filter view.

---

## 2. End-to-end flow

1. The guest taps **Pay now**. `POST /api/bookings` checks the input and **recalculates the price on the server**. It saves a `bookings` row (status `pending`) and creates a payment **order** with the gateway.
2. The gateway checkout opens: UPI apps, cards, wallets, netbanking.
3. The gateway calls `POST /api/payments/webhook`. We **verify the signature**, then mark the booking `paid`. Duplicates are ignored: each payment ID is processed once.
4. **Fulfilment** (each step records its own timestamp, so failures are retried):
   - voucher PDF, saved in a private Supabase Storage bucket
   - email to the guest with the voucher (Resend), and a copy to reservations@
   - WhatsApp to the guest with the voucher (approved template)
   - WhatsApp alert to the front desk number
   - row appended to the Google Sheet
   - lead row moved to `booked`
5. The guest's page checks `GET /api/bookings/{code}/status` and switches to **"Payment received ✓"** with a voucher download.
6. A **retry job** (Vercel Cron, every 5 minutes) re-runs any fulfilment step that failed: email, WhatsApp, or sheet.

---

## 3. Build phases

### Phase 0: accounts (owner, no code; run in parallel)
| Item | What to do | What I need |
|---|---|---|
| Payment gateway (Razorpay or Cashfree) | Sign up and complete business KYC (PAN, bank account, business proof, GSTIN if registered). The website already has the required policy pages. | Test keys at once; live key ID, key secret and webhook secret after approval |
| Google | A hotel Google account; the sheet "Hotel Teesta Bookings"; a Cloud project; a service account; the sheet shared with it | Sheet ID; service account JSON key |
| Email (Resend) | Account; verify `mainalihospitality.com` (add the DNS records it shows) | API key; sender address |
| WhatsApp Business Platform | Meta Business verification; a number not already on WhatsApp; templates `booking_confirmed` (with PDF) and `desk_new_booking` | Phone number ID; access token; approved template names; desk number |

### Phase 1: server-side bookings and payment
- Supabase `bookings` table (RLS on, no public access): code, status, guest details, dates, rooms, meal plan, every price line, gateway order and payment IDs, `paid_at`, voucher path, and the fulfilment timestamps.
- Price calculation shared between the browser (for display) and the server (the source of truth).
- `POST /api/bookings`, `POST /api/payments/webhook`, `GET /api/bookings/{code}/status`.
- Gateway checkout replaces the current UPI step. The merchant UPI QR stays as a fallback until the gateway is live.

### Phase 2: fulfilment
- Voucher PDF: hotel name and logo, "PAID", booking ID, guest, dates and times, rooms, meal plan, price breakdown, cancellation policy, contacts.
- Resend emails (guest and hotel), WhatsApp templates (guest and desk), Google Sheets append, lead update.
- Retry cron and a failure alert email to the owner.

### Phase 3: front desk polish
- Sheet formatting, protected ranges, "Today" view.
- Optional: a "Room no." column that syncs back, or a `/desk` page later.

### Phase 4: test and launch
- Gateway **test mode** end to end (success, failure, duplicate webhook, a webhook that arrives late).
- One **live ₹1 payment** (or the smallest booking), then a refund.
- Switch keys to live. Watch the first real bookings in Vercel logs and the sheet.

---

## 4. Running costs (check current prices before launch)

| Item | Cost |
|---|---|
| Google Sheets, Cloud service account | Free |
| Resend | Free tier (thousands of emails a month); paid above that |
| Payment gateway | % fee per transaction (UPI is usually the cheapest method) |
| WhatsApp (Meta) | Small per-message fee for template messages |
| Supabase | Free tier works to start. Free projects pause after a week with no activity; Pro avoids that |
| **Vercel** | **The Hobby plan is for non-commercial use only. A hotel site taking bookings should be on Pro** |

---

## 5. Decisions needed

1. Gateway: **Razorpay** or **Cashfree**.
2. Whose name appears on the gateway account: Hotel Teesta or Mainali Hospitality. This also fixes the "HOTEL SAGARMATHA" payee name.
3. WhatsApp: Meta Cloud API directly (cheapest per message) or a provider like Interakt or AiSensy (easier setup, monthly fee).
4. The desk WhatsApp number for alerts, and which staff emails get the sheet.
