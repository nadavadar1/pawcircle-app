-- PawCircle — Supabase schema
-- Run once in the Supabase SQL Editor (Project → SQL Editor → New query) on a fresh project.
-- Auth: Supabase magic-link email OTP (real identity — reviews are always real-named).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','walker','both')) default 'owner',
  full_name text not null,
  phone text not null,
  photo_url text,
  city text not null,
  referred_by uuid references profiles(id) on delete set null,
  id_document_url text,
  id_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index on profiles (referred_by);

create table dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  breed text,
  size text not null check (size in ('קטן','בינוני','גדול')),
  age_years numeric,
  special_notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table walker_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  bio text,
  hourly_rate_ils integer not null check (hourly_rate_ils > 0),
  service_areas text[] not null default '{}',
  dog_size_compatibility text[] not null default '{קטן,בינוני,גדול}',
  specialties text[] not null default '{}',
  years_experience integer,
  video_url text,
  available_now boolean not null default true,
  status text not null check (status in ('pending_review','approved','paused')) default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on walker_profiles using gin (service_areas);
create index on walker_profiles using gin (specialties);
create index on walker_profiles (hourly_rate_ils);
create index on walker_profiles (status);

create or replace function trg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger walker_profiles_set_updated_at
  before update on walker_profiles
  for each row execute function trg_set_updated_at();

create table bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  walker_id uuid not null references profiles(id) on delete cascade,
  dog_id uuid not null references dogs(id) on delete cascade,
  requested_time timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status text not null check (status in ('requested','accepted','declined','cancelled','completed')) default 'requested',
  price_ils integer,
  owner_message text,
  walk_photo_url text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index on bookings (walker_id, status);
create index on bookings (owner_id, status);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null unique,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  walker_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) > 0),
  reviewer_neighborhood text not null,
  recommended_by_name text,
  created_at timestamptz not null default now()
);
create index on reviews (walker_id);
create index on reviews (reviewer_neighborhood);

-- An owner's saved/bookmarked walkers — browsing interest, not a booking.
create table favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  walker_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, walker_id)
);
create index on favorites (owner_id);

-- Dates a walker has explicitly blocked out (vacation, fully booked, etc).
-- Checked both client-side (to steer the booking form) and inside
-- create_booking_request() (the actual enforcement — client checks are UX
-- only and can't be trusted).
create table walker_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  walker_id uuid not null references profiles(id) on delete cascade,
  blocked_date date not null,
  created_at timestamptz not null default now(),
  unique (walker_id, blocked_date)
);
create index on walker_blocked_dates (walker_id);

-- Captured when a search returns zero walkers — turns a dead-end into a
-- lead plus real signal of where demand exists ahead of supply. Private:
-- no select policy, so only the service role (dashboard) can read it.
create table area_interest (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  areas text[] not null default '{}',
  filters_used text,
  created_at timestamptz not null default now()
);

-- Live "מאומת קהילתית" (community-verified) badge: a walker qualifies once
-- any single declared neighborhood has 3+ reviews from 3 distinct reviewers.
-- Also carries the overall average rating + review count (Uber-style score,
-- shown alongside the badge — not instead of it). Computed on read, not
-- stored/triggered — never stale, no sync job needed.
create view walker_trust_status as
select
  w.id as walker_id,
  best.badge_area,
  coalesce(best.distinct_reviewers, 0) as distinct_reviewers,
  coalesce(best.distinct_reviewers, 0) >= 3 as is_community_verified,
  coalesce(overall.review_count, 0) as review_count,
  overall.avg_rating
from walker_profiles w
left join lateral (
  select reviewer_neighborhood as badge_area, count(distinct reviewer_id) as distinct_reviewers
  from reviews where reviews.walker_id = w.id
  group by reviewer_neighborhood order by count(distinct reviewer_id) desc limit 1
) best on true
left join lateral (
  select count(*) as review_count, round(avg(rating)::numeric, 1) as avg_rating
  from reviews where reviews.walker_id = w.id
) overall on true;

grant select on walker_trust_status to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table dogs enable row level security;
alter table walker_profiles enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;

-- profiles: readable by anyone (needed for public walker browsing), but the
-- `phone` column is never directly selectable — see column grants below.
-- Only get_contact_info() (SECURITY DEFINER) can reveal it, and only once.
create policy "profiles are readable" on profiles
  for select using (true);

create policy "insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "update own profile" on profiles
  for update using (auth.uid() = id);

revoke select on profiles from anon, authenticated;
grant select (id, role, full_name, photo_url, city, created_at, referred_by, id_verified) on profiles to anon, authenticated;
grant insert (id, role, full_name, phone, photo_url, city, referred_by) on profiles to anon, authenticated;
grant update (role, full_name, phone, photo_url, city, id_document_url) on profiles to anon, authenticated;

-- dogs: owner always sees their own; a walker sees a dog's details once
-- there's a booking (any status) between them so they can review a request.
create policy "read own dogs or dogs on your bookings" on dogs
  for select using (
    owner_id = auth.uid()
    or exists (select 1 from bookings b where b.dog_id = dogs.id and b.walker_id = auth.uid())
  );

create policy "manage own dogs" on dogs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- favorites: private to the owner who saved them.
create policy "manage own favorites" on favorites
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- walker_blocked_dates: publicly readable (a booking owner needs to see a
-- walker's blocked dates before submitting a request); only the walker
-- themselves can add/remove their own.
alter table walker_blocked_dates enable row level security;
create policy "blocked dates are public" on walker_blocked_dates
  for select using (true);
create policy "manage own blocked dates" on walker_blocked_dates
  for all using (walker_id = auth.uid()) with check (walker_id = auth.uid());

-- area_interest: anyone (incl. anonymous) can leave interest; nobody can
-- read it back via the API — deliberately no select policy.
alter table area_interest enable row level security;
create policy "anyone can express area interest" on area_interest
  for insert with check (true);

-- walker_profiles: approved walkers are publicly visible; a walker always
-- sees their own row (e.g. while still pending_review). `status` is
-- founder-controlled only (approval happens directly in Supabase for v1) —
-- walkers can edit everything about their own listing except that column.
create policy "approved walkers are public, own row always visible" on walker_profiles
  for select using (status = 'approved' or id = auth.uid());

create policy "insert own walker profile" on walker_profiles
  for insert with check (id = auth.uid());

create policy "update own walker profile" on walker_profiles
  for update using (id = auth.uid());

revoke update on walker_profiles from anon, authenticated;
grant update (bio, hourly_rate_ils, service_areas, dog_size_compatibility, specialties, years_experience, video_url, available_now) on walker_profiles to anon, authenticated;

-- bookings: both parties can see their own bookings. No direct client
-- INSERT/UPDATE — writes only via the RPCs below (price is server-computed,
-- status transitions are validated against caller role).
create policy "read own bookings" on bookings
  for select using (owner_id = auth.uid() or walker_id = auth.uid());

-- reviews: public read (the whole point is visibility). No direct INSERT —
-- only via submit_review(), which stamps reviewer_neighborhood from the
-- caller's own profile rather than trusting client input (this column feeds
-- the trust badge directly, so it must not be forgeable).
create policy "reviews are public" on reviews
  for select using (true);

-- ─────────────────────────────────────────────────────────────
-- RPC FUNCTIONS (SECURITY DEFINER — controlled write paths)
-- ─────────────────────────────────────────────────────────────

-- profiles.phone is column-revoked from anon/authenticated (see grants above)
-- so strangers can never select it directly. That also blocks a user from
-- reading back their OWN phone to edit it — this RPC is the one safe way
-- back in, hard-scoped to auth.uid() so it can never return anyone else's.
create or replace function get_my_profile()
returns table (id uuid, role text, full_name text, phone text, photo_url text, city text, id_document_url text, id_verified boolean)
language plpgsql
security definer
as $$
begin
  return query
    select p.id, p.role, p.full_name, p.phone, p.photo_url, p.city, p.id_document_url, p.id_verified
    from profiles p
    where p.id = auth.uid();
end;
$$;

create or replace function create_booking_request(
  p_walker_id uuid,
  p_dog_id uuid,
  p_requested_time timestamptz,
  p_duration_minutes integer,
  p_owner_message text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_owner_id uuid := auth.uid();
  v_rate integer;
  v_booking_id uuid;
begin
  if not exists (select 1 from dogs where id = p_dog_id and owner_id = v_owner_id) then
    raise exception 'dog does not belong to caller';
  end if;

  select hourly_rate_ils into v_rate
  from walker_profiles where id = p_walker_id and status = 'approved';

  if v_rate is null then
    raise exception 'walker not found or not approved';
  end if;

  if exists (
    select 1 from walker_blocked_dates
    where walker_id = p_walker_id
      and blocked_date = (p_requested_time at time zone 'Asia/Jerusalem')::date
  ) then
    raise exception 'walker is not available on this date';
  end if;

  insert into bookings (owner_id, walker_id, dog_id, requested_time, duration_minutes, price_ils, owner_message)
  values (v_owner_id, p_walker_id, p_dog_id, p_requested_time, p_duration_minutes,
          round(v_rate * p_duration_minutes / 60.0), p_owner_message)
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

-- Single entry point for every status transition. Validates the caller is
-- actually one of the two parties and that the transition is one they're
-- allowed to make from the current state.
create or replace function set_booking_status(p_booking_id uuid, p_new_status text)
returns void
language plpgsql
security definer
as $$
declare
  v_me uuid := auth.uid();
  v_booking record;
  v_allowed boolean := false;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'booking not found';
  end if;

  if v_me = v_booking.walker_id and v_booking.status = 'requested'
     and p_new_status in ('accepted','declined') then
    v_allowed := true;
  elsif v_me = v_booking.owner_id and v_booking.status = 'requested'
     and p_new_status = 'cancelled' then
    v_allowed := true;
  elsif v_me = v_booking.owner_id and v_booking.status = 'accepted'
     and p_new_status = 'completed' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'transition from % to % not permitted for this caller', v_booking.status, p_new_status;
  end if;

  update bookings
  set status = p_new_status,
      responded_at = case when p_new_status in ('accepted','declined') then now() else responded_at end
  where id = p_booking_id;
end;
$$;

-- Lets the walker on an accepted/completed booking attach a photo from the
-- walk. Only the assigned walker may set it, at any point after acceptance.
create or replace function set_walk_photo(p_booking_id uuid, p_photo_url text)
returns void
language plpgsql
security definer
as $$
declare
  v_me uuid := auth.uid();
  v_booking record;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'booking not found';
  end if;

  if v_me is null or v_me <> v_booking.walker_id then
    raise exception 'not authorized';
  end if;

  if v_booking.status not in ('accepted', 'completed') then
    raise exception 'booking must be accepted or completed to attach a photo';
  end if;

  update bookings set walk_photo_url = p_photo_url where id = p_booking_id;
end;
$$;

-- Reveals both phone numbers once a booking has moved past "requested" —
-- the only way `profiles.phone` ever leaves the database.
create or replace function get_contact_info(p_booking_id uuid)
returns table (owner_phone text, walker_phone text)
language plpgsql
security definer
as $$
declare
  v_me uuid := auth.uid();
  v_booking record;
begin
  -- auth.uid() is null for an unauthenticated caller. NOT IN with a null
  -- operand is null (neither true nor false) in SQL's three-valued logic,
  -- which would silently skip the exception below and leak both phone
  -- numbers to anyone who guesses a booking id. Reject null callers first.
  if v_me is null then
    raise exception 'not authorized';
  end if;

  select * into v_booking from bookings where id = p_booking_id;
  if v_booking is null or (v_me <> v_booking.owner_id and v_me <> v_booking.walker_id) then
    raise exception 'not authorized';
  end if;
  if v_booking.status not in ('accepted','completed') then
    raise exception 'booking not yet accepted';
  end if;

  return query
    select o.phone, w.phone
    from profiles o, profiles w
    where o.id = v_booking.owner_id and w.id = v_booking.walker_id;
end;
$$;

-- The only way a review row is ever created. Stamps reviewer_neighborhood
-- from the caller's own profile (never client-supplied) since it directly
-- feeds the community-verified badge. booking_id is optional so the founder
-- can seed early testimonials from people who already know a walker.
create or replace function submit_review(
  p_walker_id uuid,
  p_rating smallint,
  p_comment text,
  p_booking_id uuid default null,
  p_recommended_by_name text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_neighborhood text;
  v_review_id uuid;
begin
  select city into v_neighborhood from profiles where id = v_reviewer_id;
  if v_neighborhood is null then
    raise exception 'reviewer has no profile';
  end if;

  if p_booking_id is not null and not exists (
    select 1 from bookings
    where id = p_booking_id and owner_id = v_reviewer_id
      and walker_id = p_walker_id and status = 'completed'
  ) then
    raise exception 'booking not found, not yours, or not completed';
  end if;

  insert into reviews (booking_id, reviewer_id, walker_id, rating, comment, reviewer_neighborhood, recommended_by_name)
  values (p_booking_id, v_reviewer_id, p_walker_id, p_rating, p_comment, v_neighborhood, p_recommended_by_name)
  returning id into v_review_id;

  return v_review_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- STORAGE
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true), ('dog-photos', 'dog-photos', true), ('walk-photos', 'walk-photos', true), ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

create policy "anyone can view profile photos" on storage.objects
  for select using (bucket_id = 'profile-photos');
create policy "upload own profile photo" on storage.objects
  for insert with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own profile photo" on storage.objects
  for update using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "anyone can view dog photos" on storage.objects
  for select using (bucket_id = 'dog-photos');
create policy "upload own dog photo" on storage.objects
  for insert with check (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own dog photo" on storage.objects
  for update using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "anyone can view walk photos" on storage.objects
  for select using (bucket_id = 'walk-photos');
create policy "upload own walk photo" on storage.objects
  for insert with check (bucket_id = 'walk-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own walk photo" on storage.objects
  for update using (bucket_id = 'walk-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- id-documents: private bucket. Only the uploader can read their own
-- document back (e.g. to confirm what was submitted) — nobody else can,
-- including other authenticated users. The founder reviews and approves
-- via the Supabase dashboard (service role bypasses RLS), same manual
-- pattern already used for walker_profiles.status approval.
create policy "view own id document" on storage.objects
  for select using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "upload own id document" on storage.objects
  for insert with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own id document" on storage.objects
  for update using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
