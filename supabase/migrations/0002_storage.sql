-- Photo storage. Run AFTER 0001_init.sql, in the Supabase SQL Editor.
-- (Not covered by the local test suite because it needs Supabase's storage tables.)
--
-- Layout rule: every file lives under a folder named with the uploader's user id,
-- for example  photos/<user-id>/stage.jpg . The policies below only let you write
-- inside your own folder. The bucket is public-read so <img> tags just work.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
