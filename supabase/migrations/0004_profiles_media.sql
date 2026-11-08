-- Instagram-style profiles: photo and video posts, a shop, and public stats.
-- Run AFTER 0001, 0002 and 0003, in the Supabase SQL Editor. Safe to run once.
--
-- How the pieces fit:
--   posts      gain optional media (a photo or a video stored in Supabase Storage).
--              Posts show on the author's profile grid AND in the feed.
--   products   a musician's shop items: photo, price, optional buy link. GigMate
--              never handles the money; the link goes to the band's own store.
--   storage    a new 'videos' bucket. Every file lives under a folder named with
--              the uploader's user id, and the database also checks that, so a
--              post can never point at someone else's file.

-- ---------------------------------------------------------------------------
-- Posts with media
-- ---------------------------------------------------------------------------
alter table public.posts add column media_path  text;   -- path inside the bucket: <author_id>/<file>
alter table public.posts add column media_type  text check (media_type in ('image', 'video'));
alter table public.posts add column poster_path text;   -- thumbnail for a video, in the 'photos' bucket

alter table public.posts add constraint posts_media_consistent check (
  (media_path is null and media_type is null and poster_path is null)
  or (media_path is not null and media_type is not null)
);
alter table public.posts add constraint posts_media_owned check (
  (media_path  is null or media_path  like author_id::text || '/%')
  and (poster_path is null or poster_path like author_id::text || '/%')
);

-- A photo or video can be posted without words; a text post still needs some.
alter table public.posts drop constraint posts_body_check;
alter table public.posts add constraint posts_body_check check (
  char_length(body) <= 1000 and (char_length(body) >= 1 or media_path is not null)
);

-- ---------------------------------------------------------------------------
-- Listen links: at most 8 per musician
-- ---------------------------------------------------------------------------
alter table public.musician_profiles add constraint media_links_max check (
  jsonb_typeof(media_links) = 'array' and jsonb_array_length(media_links) <= 8
);

-- ---------------------------------------------------------------------------
-- Shop
-- ---------------------------------------------------------------------------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  price_cents integer not null check (price_cents >= 0 and price_cents <= 1000000),
  description text check (char_length(description) <= 300),
  photo_path  text check (photo_path is null or photo_path like owner_id::text || '/%'),
  buy_url     text check (buy_url is null or buy_url ~* '^https?://'),
  created_at  timestamptz not null default now()
);
create index products_owner_idx on public.products (owner_id, created_at desc);

alter table public.products enable row level security;
create policy products_read   on public.products for select to authenticated using (true);
create policy products_insert on public.products for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.current_role_is('musician'));
create policy products_update on public.products for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy products_delete on public.products for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Public stats. Bookings are private to the two parties, but "gigs played" is a
-- public number on a profile. This view shares only the count, nothing else.
-- ---------------------------------------------------------------------------
create view public.musician_stats as
  select b.musician_id, (count(*) filter (where b.completed_at is not null))::int as gigs_played
  from public.bookings b
  group by b.musician_id;
grant select on public.musician_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Video storage (images keep using the 'photos' bucket from 0002)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 41943040, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy videos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy videos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy videos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Deleting a file needs permission to SEE it first (Postgres applies the read
-- rule to a delete). Without these, a user could upload but never remove their own
-- files. Reads through the public URL are unaffected; this only covers the API.
create policy photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy videos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
