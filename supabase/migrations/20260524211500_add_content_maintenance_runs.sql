create table if not exists public.content_maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manual',
  status text not null default 'success' check (status in ('success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  processed_count integer not null default 0,
  cached_count integer not null default 0,
  healthy_count integer not null default 0,
  warning_count integer not null default 0,
  broken_count integer not null default 0,
  unpublished_count integer not null default 0,
  error_message text,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.content_maintenance_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_maintenance_runs'
      and policyname = 'maintenance runs admin read'
  ) then
    create policy "maintenance runs admin read"
      on public.content_maintenance_runs
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end
$$;

create index if not exists idx_content_maintenance_runs_started_at
  on public.content_maintenance_runs (started_at desc);

create index if not exists idx_content_maintenance_runs_status
  on public.content_maintenance_runs (status);
