-- Phase 3 tightening. Run AFTER 0001_init.sql, in the Supabase SQL Editor.
-- Safe to run once. It replaces two policies from 0001.
--
-- 1. A musician may only withdraw an application that is still pending.
--    Before this, someone could flip an ACCEPTED application to withdrawn and
--    leave the venue with a booking that has no matching application.
-- 2. A musician may only apply to a slot that is open AND has not started yet.

drop policy applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
  with check (
    musician_id = (select auth.uid())
    and status = 'pending'
    and public.current_role_is('musician')
    and exists (
      select 1 from public.gig_slots s
      where s.id = slot_id and s.status = 'open' and s.starts_at > now()
    )
  );

drop policy applications_withdraw on public.applications;
create policy applications_withdraw on public.applications for update to authenticated
  using (musician_id = (select auth.uid()) and status = 'pending')
  with check (musician_id = (select auth.uid()) and status = 'withdrawn');
