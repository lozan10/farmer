-- FarmerLink dashboard — Supabase schema for the settings screens.
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- NOTE ON SECURITY: the app uses the publishable/anon key in the browser, and
-- there is no end-user auth yet, so the policies below allow anonymous access
-- to the non-sensitive columns. Password hashes are written/read only by the
-- server (service-role key) and are blocked from the anon key via the REVOKE.

-- ── User management ────────────────────────────────────────────────────────
create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  role          text not null default 'Viewer',
  status        text not null default 'Active' check (status in ('Active','Invited','Suspended')),
  initials      text,
  modules       text[] not null default array['Overview'],
  password_hash text,
  created_at    timestamptz not null default now()
);

-- If the table already existed, make sure the hash column is present.
alter table public.app_users add column if not exists password_hash text;

alter table public.app_users enable row level security;

drop policy if exists app_users_anon_all on public.app_users;
create policy app_users_anon_all on public.app_users
  for all to anon using (true) with check (true);

-- Keep the password hash out of reach of the public (anon) key. The browser
-- lists users without this column; only the server (service role) reads/writes it.
revoke select (password_hash), insert (password_hash), update (password_hash)
  on public.app_users from anon;

-- ── User profile (single row for the pilot) ────────────────────────────────
create table if not exists public.user_profiles (
  id           text primary key default 'me',
  name         text not null,
  email        text not null,
  phone        text,
  location     text,
  role         text,
  organization text,
  bio          text,
  updated_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_anon_all on public.user_profiles;
create policy user_profiles_anon_all on public.user_profiles
  for all to anon using (true) with check (true);

-- ── Seed data (matches the app's built-in defaults; no passwords set) ───────
insert into public.app_users (name, email, role, status, initials, modules) values
  ('Kenneth Owori','kenneth@trustandtrade.org','Administrator','Active','KO',
    array['Overview','Farm management','Supply management','Trading','Training','Traceability','Lots & transactions']),
  ('Sarah Nakato','sarah.nakato@trustandtrade.org','Farm Manager','Active','SN',
    array['Overview','Farm management','Supply management']),
  ('David Okello','david.okello@trustandtrade.org','Field Officer','Active','DO',
    array['Overview','Farm management','Traceability']),
  ('Mercy Achieng','mercy.achieng@trustandtrade.org','Data Analyst','Invited','MA',
    array['Overview','Trading','Lots & transactions']),
  ('Ivan Mugisha','ivan.mugisha@trustandtrade.org','Viewer','Suspended','IM',
    array['Overview'])
on conflict (email) do nothing;

insert into public.user_profiles (id, name, email, phone, location, role, organization, bio) values
  ('me','Kenneth Owori','kenneth@trustandtrade.org','+256 772 000 000','Kampala, Uganda',
   'Administrator','Trust&Trade pilot',
   'Coordinates farmer onboarding and traceability for the pilot program.')
on conflict (id) do nothing;
