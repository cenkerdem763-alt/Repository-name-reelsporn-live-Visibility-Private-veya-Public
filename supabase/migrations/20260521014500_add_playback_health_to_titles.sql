alter table public.titles
  add column if not exists playback_status text not null default 'unchecked'
    check (playback_status in ('unchecked', 'healthy', 'warning', 'broken')),
  add column if not exists playback_checked_at timestamptz,
  add column if not exists playback_error text;

create index if not exists idx_titles_playback_status
  on public.titles (playback_status);
