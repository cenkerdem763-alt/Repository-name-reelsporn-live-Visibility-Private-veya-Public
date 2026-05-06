
create table public.titles (
  id text primary key,
  title text not null,
  description text not null default '',
  year integer not null default 2025,
  duration text not null default '',
  rating text not null default '13+',
  match_score integer not null default 90,
  type text not null default 'film' check (type in ('film','dizi')),
  genres text[] not null default '{}',
  poster_url text not null default '',
  backdrop_url text not null default '',
  trailer_url text,
  video_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.titles enable row level security;

create policy "titles public read" on public.titles for select to anon, authenticated using (true);
create policy "titles admin insert" on public.titles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "titles admin update" on public.titles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "titles admin delete" on public.titles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_titles_updated before update on public.titles
  for each row execute function public.touch_updated_at();

create table public.content_rows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.content_rows enable row level security;
create policy "rows public read" on public.content_rows for select to anon, authenticated using (true);
create policy "rows admin all" on public.content_rows for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.content_row_items (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.content_rows(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  position integer not null default 0,
  unique (row_id, title_id)
);
alter table public.content_row_items enable row level security;
create policy "row items public read" on public.content_row_items for select to anon, authenticated using (true);
create policy "row items admin all" on public.content_row_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for posters/backdrops
insert into storage.buckets (id, name, public) values ('content', 'content', true)
on conflict (id) do nothing;

create policy "content public read" on storage.objects for select using (bucket_id = 'content');
create policy "content admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'content' and public.has_role(auth.uid(), 'admin'));
create policy "content admin update" on storage.objects for update to authenticated
  using (bucket_id = 'content' and public.has_role(auth.uid(), 'admin'));
create policy "content admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'content' and public.has_role(auth.uid(), 'admin'));
