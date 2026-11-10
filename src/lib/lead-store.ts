/**
 * Writes leads to Supabase (`public.leads`) through the `capture_lead` function. Server only.
 *
 * With SUPABASE_SECRET_KEY set (Vercel → Environment Variables), the server writes with its own key and
 * the public key can be shut out of `capture_lead` altogether (supabase/manual/lock_down_capture_lead.sql).
 * Without it, the server falls back to the publishable key, which is public by design.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fbpxnrpjvskknzlyvceq.supabase.co";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_0dlfpCgqJiLbbg038WcS9w_UWw2DpcB";

export type LeadRow = {
  p_id: string;
  p_phone: string;
  p_name: string | null;
  p_email: string | null;
  p_check_in: string | null;
  p_check_out: string | null;
  p_guests: number | null;
  p_rooms: string | null;
  p_meal_plan: string | null;
  p_total: number | null;
  p_stage: string;
  p_booking_id: string | null;
  p_upi_ref: string | null;
};

function rpc(key: string, body: object) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/capture_lead`, {
    method: "POST",
    // New keys (sb_…) go in `apikey` alone; the older JWT keys also need the Authorization header.
    headers: { apikey: key, "Content-Type": "application/json", ...(key.startsWith("eyJ") && { Authorization: `Bearer ${key}` }) },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
}

/** Saves a lead. True when the database took it. */
export async function saveLead(row: LeadRow): Promise<boolean> {
  const secret = process.env.SUPABASE_SECRET_KEY;
  try {
    let res = await rpc(secret || PUBLISHABLE_KEY, row);
    // A mistyped or revoked secret key must not cost the hotel its leads: try the public key before giving up.
    if (secret && (res.status === 401 || res.status === 403)) {
      console.error(`capture_lead: SUPABASE_SECRET_KEY was refused (${res.status}). Falling back to the publishable key.`);
      res = await rpc(PUBLISHABLE_KEY, row);
    }
    if (!res.ok) console.error(`capture_lead failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
    return res.ok;
  } catch (e) {
    console.error("capture_lead unreachable", e);
    return false;
  }
}

export type LeadStoreStatus = { serverKey: "working" | "missing" | "refused" | "unknown"; publicKey: "open" | "locked" | "unknown" };

/**
 * Checks, without writing anything, which keys the database accepts. It calls `capture_lead` with an empty
 * phone number: a key that may run the function gets "invalid phone" back; a key that may not is refused first.
 */
export async function leadStoreStatus(): Promise<LeadStoreStatus> {
  const probe = async (key: string): Promise<"ok" | "refused" | "unknown"> => {
    try {
      const res = await rpc(key, { p_id: "00000000-0000-4000-8000-000000000000", p_phone: "" });
      if (res.status === 401 || res.status === 403) return "refused";
      return res.status === 400 && (await res.text()).includes("invalid phone") ? "ok" : "unknown";
    } catch {
      return "unknown";
    }
  };
  const secret = process.env.SUPABASE_SECRET_KEY;
  const [s, p] = await Promise.all([secret ? probe(secret) : null, probe(PUBLISHABLE_KEY)]);
  return {
    serverKey: s === null ? "missing" : s === "ok" ? "working" : s,
    publicKey: p === "ok" ? "open" : p === "refused" ? "locked" : "unknown",
  };
}
