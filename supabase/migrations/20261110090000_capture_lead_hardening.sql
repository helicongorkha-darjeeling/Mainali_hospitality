-- capture_lead, hardened. Same name and arguments as before, so nothing that calls it changes.
--
-- Why: the function is the only way into public.leads, and every lead is copied to the front desk's
-- Google Sheet. Before this, a caller could store any text, including a spreadsheet formula ("=IMPORTDATA(…)"),
-- and could add rows without limit.
--
-- What changes:
--   * text can no longer start with a formula character (= + - @) or contain control characters
--   * the phone keeps only phone characters; email, meal plan and booking ID must look like what they are
--   * at most 100 brand-new leads in any 10 minutes (existing leads can always be updated)
--   * the server's own key (service_role) is allowed to call it, ready for locking the public key out
--     (supabase/manual/lock_down_capture_lead.sql)

create index if not exists leads_created_at_idx on public.leads (created_at desc);

create or replace function public.capture_lead(
  p_id          uuid,
  p_phone       text,
  p_name        text default null,
  p_email       text default null,
  p_check_in    date default null,
  p_check_out   date default null,
  p_guests      int  default null,
  p_rooms       text default null,
  p_meal_plan   text default null,
  p_total       int  default null,
  p_stage       text default 'details',
  p_booking_id  text default null,
  p_upi_ref     text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stages constant text[] := array['details', 'rooms', 'review', 'payment', 'booked'];
  -- control characters become spaces; then anything a spreadsheet would read as the start of a formula is dropped
  unsafe_start constant text := '^[\s=+@-]+';
  v_phone text := left(btrim(regexp_replace(coalesce(p_phone, ''), '[^0-9+() -]', '', 'g')), 20);
  v_name  text := btrim(regexp_replace(regexp_replace(coalesce(p_name, ''),  '[[:cntrl:]]', ' ', 'g'), unsafe_start, ''));
  v_email text := btrim(regexp_replace(regexp_replace(coalesce(p_email, ''), '[[:cntrl:]]', ' ', 'g'), unsafe_start, ''));
  v_rooms text := btrim(regexp_replace(regexp_replace(coalesce(p_rooms, ''), '[[:cntrl:]]', ' ', 'g'), unsafe_start, ''));
  digits int := length(regexp_replace(v_phone, '\D', '', 'g'));
  recent int;
begin
  if p_id is null then
    raise exception 'invalid id';
  end if;
  if digits < 8 or digits > 15 then
    raise exception 'invalid phone';
  end if;
  if array_position(stages, p_stage) is null then
    raise exception 'invalid stage';
  end if;

  -- A flood of made-up leads would bury the real ones in the desk's sheet. Real traffic for a 25-room
  -- hotel is far below this; a visitor already in the list is never turned away.
  if not exists (select 1 from public.leads where id = p_id) then
    select count(*) into recent from public.leads where created_at > now() - interval '10 minutes';
    if recent >= 100 then
      raise exception 'too many new leads, try again later';
    end if;
  end if;

  insert into public.leads as l
    (id, phone, name, email, check_in, check_out, guests, rooms, meal_plan, total, stage, booking_id, upi_ref)
  values (
    p_id,
    v_phone,
    left(nullif(v_name, ''), 120),
    case when v_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then left(v_email, 200) end,
    p_check_in,
    p_check_out,
    case when p_guests between 1 and 50 then p_guests end,
    left(nullif(v_rooms, ''), 200),
    case when p_meal_plan in ('EP', 'CP', 'MAP', 'AP') then p_meal_plan end,
    case when p_total between 0 and 10000000 then p_total end,
    p_stage,
    case when p_booking_id ~ '^TST-\d{6}-[A-Z0-9]{4}$' then p_booking_id end,
    left(nullif(regexp_replace(coalesce(p_upi_ref, ''), '[^A-Za-z0-9]', '', 'g'), ''), 40)
  )
  on conflict (id) do update set
    phone      = excluded.phone,
    name       = coalesce(excluded.name, l.name),
    email      = coalesce(excluded.email, l.email),
    check_in   = coalesce(excluded.check_in, l.check_in),
    check_out  = coalesce(excluded.check_out, l.check_out),
    guests     = coalesce(excluded.guests, l.guests),
    rooms      = coalesce(excluded.rooms, l.rooms),
    meal_plan  = coalesce(excluded.meal_plan, l.meal_plan),
    total      = coalesce(excluded.total, l.total),
    -- stage only moves forward (a visitor going back a step doesn't lose "payment")
    stage      = case when array_position(stages, excluded.stage) > array_position(stages, l.stage)
                      then excluded.stage else l.stage end,
    booking_id = coalesce(excluded.booking_id, l.booking_id),
    upi_ref    = coalesce(excluded.upi_ref, l.upi_ref),
    updated_at = now();
end;
$$;

-- The website's server writes leads with its own key once SUPABASE_SECRET_KEY is set in Vercel.
grant execute on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) to service_role;

comment on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) is
  'Website lead capture. Write-only: cleans every field (no spreadsheet formulas), upserts one row per visitor id, caps new leads at 100 per 10 minutes, never returns data.';
