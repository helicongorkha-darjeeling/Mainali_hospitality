-- Leads: one row per website visitor who leaves a phone number, updated as they move through booking.
-- Applied to Supabase project "Mainali_hospitality" (fbpxnrpjvskknzlyvceq) on 2026-10-17.

create table public.leads (
  id          uuid primary key,                      -- random id generated in the visitor's browser
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  phone       text not null,
  name        text,
  email       text,
  check_in    date,
  check_out   date,
  guests      int,
  rooms       text,                                  -- e.g. "1 × The Quad"
  meal_plan   text,                                  -- EP / CP / MAP / AP
  total       int,                                   -- quoted total in ₹
  stage       text not null default 'details'
              check (stage in ('details', 'rooms', 'review', 'payment', 'booked')),
  booking_id  text,
  upi_ref     text,
  called      boolean not null default false         -- tick after the front desk has called
);

create index leads_updated_at_idx on public.leads (updated_at desc);

-- Only the dashboard (service role) can read or edit leads. The website writes through capture_lead().
alter table public.leads enable row level security;
revoke all on table public.leads from anon, authenticated;

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
  digits int := length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'));
begin
  if digits < 8 or digits > 15 then
    raise exception 'invalid phone';
  end if;
  if array_position(stages, p_stage) is null then
    raise exception 'invalid stage';
  end if;

  insert into public.leads as l
    (id, phone, name, email, check_in, check_out, guests, rooms, meal_plan, total, stage, booking_id, upi_ref)
  values (
    p_id,
    left(trim(p_phone), 20),
    left(nullif(trim(p_name), ''), 120),
    left(nullif(trim(p_email), ''), 200),
    p_check_in,
    p_check_out,
    case when p_guests between 1 and 50 then p_guests end,
    left(nullif(trim(p_rooms), ''), 200),
    left(nullif(trim(p_meal_plan), ''), 40),
    case when p_total between 0 and 10000000 then p_total end,
    p_stage,
    left(nullif(trim(p_booking_id), ''), 40),
    left(nullif(trim(p_upi_ref), ''), 40)
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

-- Write-only for the website: the anon role can call it; nobody else outside the dashboard.
revoke all on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) from public;
grant execute on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) to anon;

comment on function public.capture_lead(uuid, text, text, text, date, date, int, text, text, int, text, text, text) is
  'Website lead capture. Write-only for anon: validates the phone, upserts one row per visitor id, never returns data.';
comment on table public.leads is
  'Website visitors who left a phone number. stage = how far they got: details → rooms → review → payment → booked. Tick called after phoning.';
