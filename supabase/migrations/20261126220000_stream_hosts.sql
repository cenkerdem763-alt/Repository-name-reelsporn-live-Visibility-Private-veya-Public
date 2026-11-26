-- Admin-only host inventory; does not expose private hosts to site visitors.
create table if not exists public.stream_hosts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  base_url text not null unique check (base_url ~ '^https://'),
  priority integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.stream_hosts enable row level security;
revoke all on public.stream_hosts from anon;
grant select, insert, update, delete on public.stream_hosts to authenticated;
drop policy if exists "Admins manage stream hosts" on public.stream_hosts;
create policy "Admins manage stream hosts" on public.stream_hosts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
