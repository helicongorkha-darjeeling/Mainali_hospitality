-- Every new or updated lead is sent to the front desk Google Sheet (Apps Script web app) within seconds.
-- The sheet URL and a shared secret live in Supabase Vault; until both exist the trigger does nothing.
-- Applied to Supabase project "Mainali_hospitality" (fbpxnrpjvskknzlyvceq) on 2026-10-25.
create extension if not exists pg_net with schema extensions;

create or replace function public.leads_to_sheet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook_url text;
  hook_secret text;
begin
  select decrypted_secret into hook_url from vault.decrypted_secrets where name = 'sheets_webhook_url';
  select decrypted_secret into hook_secret from vault.decrypted_secrets where name = 'sheets_webhook_secret';
  if hook_url is null or hook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := hook_url,
    body := jsonb_build_object('secret', hook_secret, 'record', to_jsonb(new)),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000
  );
  return new;
end;
$$;

revoke all on function public.leads_to_sheet() from public, anon, authenticated;

create trigger leads_to_sheet
after insert or update on public.leads
for each row execute function public.leads_to_sheet();

-- Shared secret the Apps Script checks before writing a row (generated here, never stored in git).
select vault.create_secret(
  encode(extensions.gen_random_bytes(24), 'hex'),
  'sheets_webhook_secret',
  'Shared secret for the leads → Google Sheet sync'
)
where not exists (select 1 from vault.secrets where name = 'sheets_webhook_secret');

-- After deploying the Apps Script web app, store its URL (once):
--   select vault.create_secret('<web app /exec URL>', 'sheets_webhook_url', 'Front desk Google Sheet web app');
