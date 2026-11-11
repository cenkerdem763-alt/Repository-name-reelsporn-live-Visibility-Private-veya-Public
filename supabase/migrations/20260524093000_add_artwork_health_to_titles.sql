alter table public.titles
  add column if not exists publication_status text not null default 'published'
    check (publication_status in ('published', 'unpublished', 'draft')),
  add column if not exists artwork_status text not null default 'unchecked'
    check (artwork_status in ('unchecked', 'healthy', 'cached', 'warning', 'broken')),
  add column if not exists artwork_checked_at timestamptz,
  add column if not exists artwork_cached_at timestamptz,
  add column if not exists artwork_error text,
  add column if not exists poster_source_url text,
  add column if not exists backdrop_source_url text;

create index if not exists idx_titles_publication_status
  on public.titles (publication_status);

create index if not exists idx_titles_artwork_status
  on public.titles (artwork_status);

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
end
$$;
