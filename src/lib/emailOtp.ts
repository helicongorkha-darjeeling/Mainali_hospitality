"use client";

/**
 * Email verification with a one-time code, using Supabase Auth's email OTP (free).
 * Supabase emails a 6-digit code; the guest types it in; Supabase checks it.
 * Uses the same public URL and publishable key as lead capture (src/lib/leads.ts).
 *
 * Needs, in the Supabase dashboard: custom SMTP (the hotel's mailbox) and the "Magic Link"
 * email template showing {{ .Token }}. See docs/EMAIL_OTP_SETUP.md.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fbpxnrpjvskknzlyvceq.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_0dlfpCgqJiLbbg038WcS9w_UWw2DpcB";

const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };

export type SendResult = "sent" | "wait" | "bad_email" | "unavailable";

export async function sendEmailCode(email: string): Promise<SendResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: true }),
    });
    if (res.ok) return "sent";
    if (res.status === 429) return "wait";
    const j = await res.json().catch(() => ({}));
    const msg = String(j.msg ?? j.message ?? j.error_description ?? "").toLowerCase();
    if (res.status === 400 && msg.includes("invalid") && msg.includes("email")) return "bad_email";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "email", email: email.trim().toLowerCase(), token: code.trim() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** A verified email stays verified for this browser tab, so going back a step doesn't ask again. */
const KEY = "teesta.email.verified";
export const rememberVerified = (email: string) => {
  try {
    sessionStorage.setItem(KEY, email.trim().toLowerCase());
  } catch {}
};
export const isRememberedVerified = (email: string) => {
  try {
    return !!email && sessionStorage.getItem(KEY) === email.trim().toLowerCase();
  } catch {
    return false;
  }
};
