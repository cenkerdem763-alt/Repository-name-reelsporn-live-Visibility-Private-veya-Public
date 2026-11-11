insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'content public read'
  ) then
    create policy "content public read" on storage.objects
      for select using (bucket_id = 'content');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'content admin write'
  ) then
    create policy "content admin write" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'content' and public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'content admin update'
  ) then
    create policy "content admin update" on storage.objects
      for update to authenticated
      using (bucket_id = 'content' and public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'content admin delete'
  ) then
    create policy "content admin delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'content' and public.has_role(auth.uid(), 'admin'));
  end if;
end
$$;
