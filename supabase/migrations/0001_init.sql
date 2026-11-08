-- GigMate schema, security rules and helper functions.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to read top to bottom.
--
-- Security model in one paragraph:
--   Row Level Security (RLS) decides WHICH ROWS a signed-in user may touch.
--   Column privileges (GRANT ... (columns)) decide WHICH COLUMNS they may write.
--   RLS cannot protect single columns, so fields like profiles.role or
--   gig_slots.boosted_until are protected by column grants instead.
--   Anything the browser must never decide (accepting an applicant, marking a
--   gig complete, subscription state) goes through server-side functions or
--   the service role.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role     as enum ('musician', 'venue');
create type public.slot_status   as enum ('open', 'booked', 'completed', 'cancelled');
create type public.app_status    as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type public.invite_status as enum ('pending', 'accepted', 'declined');
create type public.post_kind     as enum ('announcement', 'clip');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  city          text not null default 'Dayton',
  neighborhood  text,
  avatar_url    text,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.musician_profiles (
  profile_id        uuid primary key references public.profiles (id) on delete cascade,
  genres            text[] not null default '{}',
  rate_min_cents    integer check (rate_min_cents >= 0),
  rate_max_cents    integer check (rate_max_cents >= rate_min_cents),
  bio               text check (char_length(bio) <= 600),
  media_links       jsonb not null default '[]'::jsonb,
  photos            text[] not null default '{}',
  available_tonight boolean not null default false,
  verified_sound    boolean not null default false   -- set by GigMate staff only
);

create table public.musician_availability (
  id          uuid primary key default gen_random_uuid(),
  musician_id uuid not null references public.profiles (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  unique (musician_id, weekday)
);

create table public.venue_profiles (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  venue_type  text,
  capacity    integer check (capacity > 0),
  has_pa      boolean not null default false,
  stage_notes text check (char_length(stage_notes) <= 600),
  address     text,
  photos      text[] not null default '{}'
);

create table public.gig_slots (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references public.profiles (id) on delete cascade,
  starts_at      timestamptz not null,
  set_length_min integer not null check (set_length_min > 0),
  pay_cents      integer not null check (pay_cents >= 0),
  genre          text,
  gear_provided  text[] not null default '{}',
  notes          text check (char_length(notes) <= 600),
  status         public.slot_status not null default 'open',
  is_urgent      boolean not null default false,
  boosted_until  timestamptz,                       -- written by the server after a paid boost
  created_at     timestamptz not null default now()
);
create index gig_slots_open_idx on public.gig_slots (status, starts_at);
create index gig_slots_venue_idx on public.gig_slots (venue_id, starts_at);

create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  slot_id     uuid not null references public.gig_slots (id) on delete cascade,
  musician_id uuid not null references public.profiles (id) on delete cascade,
  status      public.app_status not null default 'pending',
  created_at  timestamptz not null default now(),
  unique (slot_id, musician_id)                     -- one application per musician per slot
);
create index applications_musician_idx on public.applications (musician_id);

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  slot_id     uuid not null references public.gig_slots (id) on delete cascade,
  musician_id uuid not null references public.profiles (id) on delete cascade,
  status      public.invite_status not null default 'pending',
  created_at  timestamptz not null default now(),
  unique (slot_id, musician_id)
);

create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  slot_id           uuid not null unique references public.gig_slots (id) on delete cascade, -- a slot can be booked once
  application_id    uuid references public.applications (id) on delete set null,
  musician_id       uuid not null references public.profiles (id) on delete cascade,
  venue_id          uuid not null references public.profiles (id) on delete cascade,
  agreed_pay_cents  integer not null check (agreed_pay_cents >= 0),
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  cancelled_by      uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text check (char_length(body) <= 1000),
  created_at  timestamptz not null default now(),
  unique (booking_id, reviewer_id),                 -- one review per side
  check (reviewer_id <> reviewee_id)
);

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  kind       public.post_kind not null default 'announcement',
  body       text not null check (char_length(body) between 1 and 1000),
  media_url  text,
  slot_id    uuid references public.gig_slots (id) on delete set null,
  created_at timestamptz not null default now()
);
create index posts_recent_idx on public.posts (created_at desc);

create table public.subscriptions (
  musician_id            uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text check (plan in ('weekly', 'monthly', 'yearly')),
  status                 text not null default 'none',
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create table public.boosts (
  id                         uuid primary key default gen_random_uuid(),
  slot_id                    uuid not null references public.gig_slots (id) on delete cascade,
  venue_id                   uuid not null references public.profiles (id) on delete cascade,
  stripe_checkout_session_id text unique,
  starts_at                  timestamptz not null default now(),
  ends_at                    timestamptz not null,
  created_at                 timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER functions run with their owner's rights, so they can read
-- tables the caller cannot. That power is why each one pins search_path and
-- checks auth.uid() itself.

-- Is the signed-in user a venue / a musician? Used inside policies.
create function public.current_role_is(r public.user_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = r);
$$;

-- Reviews stay hidden until both sides have submitted, or 7 days have passed.
-- This is a function (not a policy that queries reviews) to avoid an RLS loop.
create function public.review_is_visible(p_booking uuid, p_created timestamptz)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_created <= now() - interval '7 days'
      or (select count(*) from public.reviews r where r.booking_id = p_booking) >= 2;
$$;

-- On signup, create the profile row from the role the user chose.
-- The role must be exactly 'musician' or 'venue'. Anything else aborts signup.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  chosen public.user_role;
  shown  text;
begin
  begin
    chosen := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    raise exception 'Please choose whether you are a musician or a venue.';
  end;
  if chosen is null then
    raise exception 'Please choose whether you are a musician or a venue.';
  end if;

  shown := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  shown := coalesce(shown, split_part(coalesce(new.email, 'new user'), '@', 1));

  insert into public.profiles (id, role, display_name) values (new.id, chosen, left(shown, 80));
  if chosen = 'musician' then
    insert into public.musician_profiles (profile_id) values (new.id);
  else
    insert into public.venue_profiles (profile_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Venue accepts an applicant. One atomic step: mark accepted, decline the
-- rest, mark the slot booked, create the booking. Doing this in the database
-- means two simultaneous accepts cannot double-book a slot.
create function public.accept_application(p_application uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  app  public.applications;
  slot public.gig_slots;
  new_booking uuid;
begin
  select * into app from public.applications where id = p_application for update;
  if not found then raise exception 'That application no longer exists.'; end if;

  select * into slot from public.gig_slots where id = app.slot_id for update;
  if slot.venue_id is distinct from (select auth.uid()) then
    raise exception 'You can only accept applicants for your own gigs.';
  end if;
  if slot.status <> 'open' then raise exception 'This gig is no longer open.'; end if;
  if app.status <> 'pending' then raise exception 'This application was already answered.'; end if;

  update public.applications set status = 'accepted' where id = app.id;
  update public.applications set status = 'declined'
    where slot_id = slot.id and id <> app.id and status = 'pending';
  update public.gig_slots set status = 'booked' where id = slot.id;

  insert into public.bookings (slot_id, application_id, musician_id, venue_id, agreed_pay_cents)
  values (slot.id, app.id, app.musician_id, slot.venue_id, slot.pay_cents)
  returning id into new_booking;
  return new_booking;
end;
$$;

-- Venue taps "Gig happened". This unlocks reviews for both sides.
-- (Demo note: allowed before the start time so a demo can be run end to end.)
create function public.mark_gig_complete(p_booking uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'That booking does not exist.'; end if;
  if b.venue_id is distinct from (select auth.uid()) then
    raise exception 'Only the venue can mark a gig as finished.';
  end if;
  if b.cancelled_at is not null then raise exception 'This gig was cancelled.'; end if;
  if b.completed_at is not null then return; end if;

  update public.bookings set completed_at = now() where id = b.id;
  update public.gig_slots set status = 'completed' where id = b.slot_id;
end;
$$;

-- Public rating summary. Counts only reviews that are already visible.
-- Views run with their owner's rights, so the visibility rule is repeated here.
create view public.review_summaries as
  select r.reviewee_id, count(*)::int as review_count, round(avg(r.rating)::numeric, 2) as avg_rating
  from public.reviews r
  where public.review_is_visible(r.booking_id, r.created_at)
  group by r.reviewee_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.musician_profiles     enable row level security;
alter table public.musician_availability enable row level security;
alter table public.venue_profiles        enable row level security;
alter table public.gig_slots             enable row level security;
alter table public.applications          enable row level security;
alter table public.invitations           enable row level security;
alter table public.bookings              enable row level security;
alter table public.reviews               enable row level security;
alter table public.posts                 enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.boosts                enable row level security;

-- profiles: a public directory for signed-in users; you edit only your own.
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy musician_profiles_read   on public.musician_profiles for select to authenticated using (true);
create policy musician_profiles_update on public.musician_profiles for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy venue_profiles_read   on public.venue_profiles for select to authenticated using (true);
create policy venue_profiles_update on public.venue_profiles for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy availability_read   on public.musician_availability for select to authenticated using (true);
create policy availability_write  on public.musician_availability for all to authenticated
  using (musician_id = (select auth.uid())) with check (musician_id = (select auth.uid()));

-- gig_slots: everyone signed in can browse; only the owning venue writes.
create policy slots_read   on public.gig_slots for select to authenticated using (true);
create policy slots_insert on public.gig_slots for insert to authenticated
  with check (venue_id = (select auth.uid()) and public.current_role_is('venue'));
create policy slots_update on public.gig_slots for update to authenticated
  using (venue_id = (select auth.uid())) with check (venue_id = (select auth.uid()));
create policy slots_delete on public.gig_slots for delete to authenticated
  using (venue_id = (select auth.uid()) and status = 'open');

-- applications: the musician and the slot's venue can see it.
-- TODO(phase 4): require an active subscription to apply, once the
-- "what can a non-subscriber do" decision is made.
create policy applications_read on public.applications for select to authenticated
  using (musician_id = (select auth.uid())
         or exists (select 1 from public.gig_slots s where s.id = slot_id and s.venue_id = (select auth.uid())));
create policy applications_insert on public.applications for insert to authenticated
  with check (musician_id = (select auth.uid())
              and status = 'pending'
              and public.current_role_is('musician')
              and exists (select 1 from public.gig_slots s where s.id = slot_id and s.status = 'open'));
-- A musician may only withdraw. Accepting goes through accept_application().
create policy applications_withdraw on public.applications for update to authenticated
  using (musician_id = (select auth.uid()))
  with check (musician_id = (select auth.uid()) and status = 'withdrawn');
create policy applications_decline on public.applications for update to authenticated
  using (exists (select 1 from public.gig_slots s where s.id = slot_id and s.venue_id = (select auth.uid())))
  with check (status = 'declined');

-- invitations: venue invites for its own slots; the musician answers.
create policy invitations_read on public.invitations for select to authenticated
  using (musician_id = (select auth.uid())
         or exists (select 1 from public.gig_slots s where s.id = slot_id and s.venue_id = (select auth.uid())));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (status = 'pending'
              and exists (select 1 from public.gig_slots s where s.id = slot_id and s.venue_id = (select auth.uid())));
create policy invitations_answer on public.invitations for update to authenticated
  using (musician_id = (select auth.uid()))
  with check (musician_id = (select auth.uid()) and status in ('accepted', 'declined'));

-- bookings: only the two parties can read. NO client write policies exist,
-- so writes can only happen through accept_application() and mark_gig_complete().
create policy bookings_read on public.bookings for select to authenticated
  using (musician_id = (select auth.uid()) or venue_id = (select auth.uid()));

-- reviews: write only on completed bookings you took part in, about the other
-- party. Read your own always; read others' once review_is_visible().
create policy reviews_read on public.reviews for select to authenticated
  using (reviewer_id = (select auth.uid()) or public.review_is_visible(booking_id, created_at));
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.completed_at is not null
        and b.cancelled_at is null
        and (select auth.uid()) in (b.musician_id, b.venue_id)
        and reviewee_id = case when b.musician_id = (select auth.uid()) then b.venue_id else b.musician_id end
    )
  );

-- posts: a chronological public feed; you manage your own.
create policy posts_read   on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy posts_update on public.posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete on public.posts for delete to authenticated using (author_id = (select auth.uid()));

-- subscriptions and boosts: you can read your own; only the server writes.
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (musician_id = (select auth.uid()));
create policy boosts_read on public.boosts for select to authenticated
  using (venue_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Column privileges: protect single columns that RLS cannot.
-- ---------------------------------------------------------------------------
revoke update on public.profiles          from authenticated;
revoke update on public.musician_profiles from authenticated;
revoke update on public.gig_slots         from authenticated;
revoke insert on public.gig_slots         from authenticated;
revoke update on public.bookings          from authenticated;

grant update (display_name, city, neighborhood, avatar_url, onboarded_at)
  on public.profiles to authenticated;                                  -- NOT role
grant update (genres, rate_min_cents, rate_max_cents, bio, media_links, photos, available_tonight)
  on public.musician_profiles to authenticated;                         -- NOT verified_sound
grant insert (venue_id, starts_at, set_length_min, pay_cents, genre, gear_provided, notes, is_urgent)
  on public.gig_slots to authenticated;                                 -- NOT boosted_until, status
grant update (starts_at, set_length_min, pay_cents, genre, gear_provided, notes, is_urgent)
  on public.gig_slots to authenticated;                                 -- NOT boosted_until, status
-- status changes only via accept_application(), mark_gig_complete() and later cancel functions.

-- Functions are callable by signed-in users only, never anonymously.
revoke execute on function public.accept_application(uuid) from public, anon;
revoke execute on function public.mark_gig_complete(uuid)  from public, anon;
grant  execute on function public.accept_application(uuid) to authenticated;
grant  execute on function public.mark_gig_complete(uuid)  to authenticated;
grant  select  on public.review_summaries to authenticated;
