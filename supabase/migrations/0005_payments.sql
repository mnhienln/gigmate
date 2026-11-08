-- Phase 4: payments. Run AFTER 0001 to 0004, in the Supabase SQL Editor. Safe to run once.
--
-- The money rules, in plain words:
--   * A musician needs an ACTIVE subscription (a free trial counts) to apply for a gig.
--     Browsing is free. The database enforces this, not just the screens.
--   * A venue can cancel a confirmed gig for free if it starts 48 hours or more from now.
--     Closer than that, a $25 fee applies. The app sends the venue to Stripe Checkout, and
--     ONLY the server (after Stripe confirms the payment) can finish a late cancellation.
--   * Late cancellations are counted publicly, so musicians can see which venues are reliable.
--   * Subscription and boost state is written only by the server from Stripe's webhook.

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column trial_end timestamptz;

-- "Active" means trialing or paying, and the paid (or trial) period has not run out.
create function public.has_active_subscription(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.musician_id = p_user
      and s.status in ('trialing', 'active')
      and s.current_period_end > now()
  );
$$;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- Applying now also requires an active subscription.
drop policy applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
  with check (
    musician_id = (select auth.uid())
    and status = 'pending'
    and public.current_role_is('musician')
    and public.has_active_subscription((select auth.uid()))
    and exists (
      select 1 from public.gig_slots s
      where s.id = slot_id and s.status = 'open' and s.starts_at > now()
    )
  );

-- ---------------------------------------------------------------------------
-- Cancelling a confirmed gig
-- ---------------------------------------------------------------------------
alter table public.bookings add column cancel_fee_cents integer check (cancel_fee_cents >= 0);
alter table public.bookings add column cancelled_late boolean not null default false;

-- Free cancellation, for the venue, 48 hours or more before the start. The time check is done HERE,
-- from the real start time, so nobody can dodge the fee by calling this function for a late gig.
create function public.cancel_booking(p_booking uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bookings;
  starts timestamptz;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'That booking does not exist.'; end if;
  if b.venue_id is distinct from (select auth.uid()) then
    raise exception 'Only the venue can cancel this gig.';
  end if;
  if b.completed_at is not null then raise exception 'This gig already happened.'; end if;
  if b.cancelled_at is not null then return; end if;

  select s.starts_at into starts from public.gig_slots s where s.id = b.slot_id;
  if starts - now() < interval '48 hours' then
    raise exception 'This gig starts in under 48 hours, so a cancellation fee applies.';
  end if;

  update public.bookings set cancelled_at = now(), cancelled_by = b.venue_id, cancelled_late = false, cancel_fee_cents = 0
    where id = b.id;
  update public.gig_slots set status = 'cancelled' where id = b.slot_id;
end;
$$;
revoke execute on function public.cancel_booking(uuid) from public, anon;
grant  execute on function public.cancel_booking(uuid) to authenticated;

-- Late cancellation, called by the SERVER only, after Stripe confirms the fee was paid.
-- Not callable by signed-in users: execute is not granted to them.
create function public.apply_late_cancellation(p_booking uuid, p_fee integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'That booking does not exist.'; end if;
  if b.completed_at is not null then raise exception 'This gig already happened.'; end if;
  if b.cancelled_at is not null then return; end if;  -- already done (Stripe may send an event twice)

  update public.bookings set cancelled_at = now(), cancelled_by = b.venue_id, cancelled_late = true, cancel_fee_cents = p_fee
    where id = b.id;
  update public.gig_slots set status = 'cancelled' where id = b.slot_id;
end;
$$;
revoke execute on function public.apply_late_cancellation(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public reliability numbers for venues. Bookings are private to the two parties, but "cancelled
-- last minute N times" is meant to be public. This view shares only the counts.
-- ---------------------------------------------------------------------------
create view public.venue_reliability as
  select b.venue_id,
         (count(*) filter (where b.cancelled_late))::int            as late_cancellations,
         (count(*) filter (where b.completed_at is not null))::int  as gigs_hosted
  from public.bookings b
  group by b.venue_id;
grant select on public.venue_reliability to authenticated;
