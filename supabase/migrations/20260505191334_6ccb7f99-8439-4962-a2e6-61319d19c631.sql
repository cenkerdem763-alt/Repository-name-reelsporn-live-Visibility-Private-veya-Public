
-- Roles enum & table (security best practice)
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "users see own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles (account)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Watch profiles (multi-profile per account, Netflix-style)
create table public.watch_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'from-primary to-primary-glow',
  kids boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.watch_profiles enable row level security;
create policy "own watch_profiles all" on public.watch_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Favorites
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_profile_id uuid references public.watch_profiles(id) on delete cascade,
  title_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, watch_profile_id, title_id)
);
alter table public.favorites enable row level security;
create policy "own favorites all" on public.favorites
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Watchlist
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_profile_id uuid references public.watch_profiles(id) on delete cascade,
  title_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, watch_profile_id, title_id)
);
alter table public.watchlist enable row level security;
create policy "own watchlist all" on public.watchlist
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Watch progress
create table public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_profile_id uuid references public.watch_profiles(id) on delete cascade,
  title_id text not null,
  progress real not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, watch_profile_id, title_id)
);
alter table public.watch_progress enable row level security;
create policy "own progress all" on public.watch_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_progress_updated before update on public.watch_progress
  for each row execute function public.touch_updated_at();

-- Auto create profile + default watch profile + user role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.watch_profiles (user_id, name, color)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 'from-red-500 to-orange-500');

  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
