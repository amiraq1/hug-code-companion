create table if not exists public.profiles (
  session_id text primary key,
  name text,
  handle text,
  role text,
  bio text,
  location text,
  email text,
  website text,
  twitter text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Session can read own profile" on public.profiles;
drop policy if exists "Session can insert own profile" on public.profiles;
drop policy if exists "Session can update own profile" on public.profiles;
drop policy if exists "Session can delete own profile" on public.profiles;

create policy "Session can read own profile"
on public.profiles
for select
using (session_id = public.request_session_id());

create policy "Session can insert own profile"
on public.profiles
for insert
with check (
  session_id = public.request_session_id()
  and session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

create policy "Session can update own profile"
on public.profiles
for update
using (session_id = public.request_session_id())
with check (session_id = public.request_session_id());

create policy "Session can delete own profile"
on public.profiles
for delete
using (session_id = public.request_session_id());
