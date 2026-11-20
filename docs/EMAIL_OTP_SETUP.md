# Email verification code (OTP): setup

At "Guest details" on /book, the guest types their email, taps **Send code**, and types the 6-digit code
from the email. "Continue to payment" stays locked until the email is verified.

It uses Supabase Auth's email OTP (free) and sends from the hotel's own mailbox through Hostinger SMTP (free).
Code: `src/lib/emailOtp.ts`, `src/components/booking/EmailVerify.tsx`.

**Until the steps below are done**, Supabase refuses to email guests (its built-in mailer only sends to the
project's team). The site handles that: the guest sees "We couldn't send a code right now. You can carry on",
and can still book. So nothing breaks before setup; verification just isn't enforced yet.

## 1. Send from the hotel mailbox (custom SMTP)

Supabase dashboard → project **Mainali_hospitality** → **Authentication → Emails → SMTP Settings** →
turn on **Enable custom SMTP**:

| Field | Value |
|---|---|
| Sender email | `reservations@mainalihospitality.com` |
| Sender name | `Hotel Teesta` |
| Host | `smtp.hostinger.com` |
| Port | `465` |
| Username | `reservations@mainalihospitality.com` |
| Password | the mailbox password (from Hostinger → Emails) |
| Minimum interval between emails | `60` seconds |

Save.

## 2. Make the emails show a code, not a link

**Authentication → Emails → Templates.** A first-time guest gets **Confirm signup**; a returning guest gets
**Magic Link**. Set both to the same thing:

Subject:

```
Your Hotel Teesta code: {{ .Token }}
```

Body (Source):

```html
<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1c1813">
  <p style="letter-spacing:3px;font-size:12px;color:#7d7358;margin:0">HOTEL TEESTA · DARJEELING</p>
  <h2 style="font-weight:normal;margin:12px 0">Your verification code</h2>
  <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:18px 0">{{ .Token }}</p>
  <p>Type this code on the booking page to confirm your email. It expires in 10 minutes.</p>
  <p style="color:#888;font-size:12px">Didn't ask for this? You can ignore this email.</p>
</div>
```

Save each template.

## 3. Code length and expiry

**Authentication → Sign In / Providers → Email**:

- **Email OTP Length**: `6` (the page checks the code as soon as 6 digits are typed)
- **Email OTP Expiration**: `600` seconds (10 minutes)

## 4. Test

Open mainalihospitality.com → Book → go to Guest details → enter your own email → **Send code**.
The email should arrive within a minute (check Spam the first time and mark it "Not spam").
Type the code: the field turns green ("Verified") and "Continue to payment" unlocks.

## Notes

- Each verified guest appears under **Authentication → Users**. They have no password and can't sign in
  anywhere; it's only a record that the email was checked.
- Limits: Supabase allows about 30 emails an hour with custom SMTP by default (**Authentication → Rate Limits**);
  raise it if the hotel gets busier. One guest can ask for a new code once a minute.
