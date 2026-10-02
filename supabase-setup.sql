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

-- ---------------------------------------------------------------------------
-- card_values: admin-editable numbers shown on the dashboard stat cards.
-- Key format: "<module>|<card label>", e.g. "Communication|Radio ads aired".
-- Written only through /api/card-values, which checks the admin session and
-- uses the service role key, so no anon policy is needed.
-- ---------------------------------------------------------------------------
create table if not exists public.card_values (
  key text primary key,
  value text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.card_values enable row level security;

-- ---------------------------------------------------------------------------
-- communication_materials: images/videos uploaded in the Communication module.
-- Files live in the public "communication-materials" storage bucket; this table
-- holds their metadata. Uploads go through /api/communication (admin session +
-- service role issues a signed upload URL); the browser uploads straight to
-- Storage, so large videos don't hit the serverless request-body limit.
-- ---------------------------------------------------------------------------
create table if not exists public.communication_materials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null,            -- MIME type, e.g. image/png, video/mp4
  path        text not null,            -- object path inside the bucket
  url         text not null,            -- public URL
  size        bigint,
  uploaded_by text,
  created_at  timestamptz not null default now()
);
alter table public.communication_materials enable row level security;
-- Anyone signed into the dashboard can list materials (read goes through the
-- server/service role too, but this keeps direct reads working).
drop policy if exists comm_materials_read on public.communication_materials;
create policy comm_materials_read on public.communication_materials for select to anon using (true);

-- Public storage bucket for the files (public URLs for viewing; writes are
-- authorized per-upload by a signed URL the server issues to admins).
insert into storage.buckets (id, name, public)
values ('communication-materials', 'communication-materials', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- comm_records: Communication module activities (radio ads, banners, SMS...).
-- Read by every signed-in user; written only through /api/communications,
-- which checks the admin session and uses the service role key.
-- ---------------------------------------------------------------------------
create table if not exists public.comm_records (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  type text not null default '',
  title text not null default '',
  district text not null default '',
  quantity text not null default '',
  status text not null default 'Completed',
  happened_on date,
  created_at timestamptz not null default now()
);
alter table public.comm_records enable row level security;
