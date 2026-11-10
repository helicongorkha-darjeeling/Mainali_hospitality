-- Locks the public key out of capture_lead, so only the website's server can write leads.
--
-- This is kept out of supabase/migrations on purpose: run it too early and the website silently stops
-- saving leads. Run it by hand, in the Supabase SQL editor, only when BOTH of these are true:
--
--   1. SUPABASE_SECRET_KEY is set in Vercel (Settings → Environment Variables) and the site has been redeployed.
--   2. https://www.mainalihospitality.com/api/leads shows  "serverKey":"working"
--
-- After running it, open that address again. It should show  "serverKey":"working","publicKey":"locked".
-- Then make a test booking as far as the review step and check the lead reaches the sheet.
--
-- To undo:  grant execute on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) to anon;

revoke execute on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) from anon;
