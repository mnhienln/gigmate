-- The shop moves from musicians to venues. Run AFTER 0001 to 0005, in the Supabase SQL Editor.
--
-- Why: a venue sells bar merch (shirts, glasses, gift cards) and a musician's profile
-- is about their music and their photos and videos. So:
--   1. only a VENUE can add shop items (the insert rule changes from musician to venue)
--   2. the shop items that fictional bands had are removed (they are no longer shown anywhere)
--
-- Editing and deleting an item still belongs to its owner only (those rules are unchanged).
-- Safe to run once. Running it twice is also harmless.

delete from public.products
where owner_id in (select id from public.profiles where role = 'musician');

drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.current_role_is('venue'));
