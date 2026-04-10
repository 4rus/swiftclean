-- ================================================================
-- CleanTrack — INDIMOE Cleaning
-- Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

create extension if not exists "uuid-ossp";

-- ── STORES ──────────────────────────────────────────────────────
create table stores (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  address    text,
  lat        numeric(10,7),
  lng        numeric(10,7),
  created_at timestamptz default now()
);

-- INDIMOE store locations (DO NOT change IDs — they link to GPS in code)
insert into stores (name, address, lat, lng) values
  ('Swiss Chalet - Country Hills', '508 Country Village Way NE, Calgary, AB T3K 0R2',        51.1554, -114.0605),
  ('Bahubali',                     '6520 36 St NE Unit - 1120, Calgary, AB T3J 4C8',          51.0848, -113.9760),
  ('Explode The Dessert Cafe',     '4715 88 Ave NE #1105, Calgary, AB T3J 4E4',               51.0912, -113.9632),
  ('Mumbaayai Pure Veg',           '4100 109 Ave NE unit 3120, Calgary, AB T3N 2J1',          51.1234, -113.9581),
  ('Lovely Sweet - Savanna',       '30 Savanna Cres NE #1110, Calgary, AB T3J 2E9',           51.1050, -113.9700),
  ('Lovely Sweet - Skyview',       '6004 Country Hills Blvd NE #1860, Calgary, AB T3N 1K8',  51.1480, -114.0015),
  ('Lovely Sweet - Redstone',      '235 Red Embers Way NE #3110, Calgary, AB T3N 1E9',        51.1667, -113.9566);

-- ── PROFILES ────────────────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       text check (role in ('employee','manager')) default 'employee',
  store_id   uuid references stores(id),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'employee'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── JOBS ────────────────────────────────────────────────────────
create table jobs (
  id              uuid primary key default uuid_generate_v4(),
  store_id        uuid references stores(id) on delete cascade,
  assigned_to     uuid references profiles(id),
  client_name     text not null,
  location_detail text,
  scheduled_time  timestamptz,
  status          text check (status in ('pending','in_progress','done')) default 'pending',
  notes           text,
  created_at      timestamptz default now(),
  completed_at    timestamptz
);

-- ── PHOTOS ──────────────────────────────────────────────────────
create table photos (
  id           uuid primary key default uuid_generate_v4(),
  job_id       uuid references jobs(id) on delete cascade,
  uploaded_by  uuid references profiles(id),
  storage_path text not null,
  photo_type   text check (photo_type in ('before','after','other')) default 'other',
  caption      text,
  created_at   timestamptz default now()
);

-- ── CHECKLISTS ──────────────────────────────────────────────────
create table job_checklist (
  id         uuid primary key default uuid_generate_v4(),
  job_id     uuid references jobs(id) on delete cascade,
  item_label text not null,
  is_done    boolean default false,
  done_by    uuid references profiles(id),
  done_at    timestamptz,
  position   int default 0
);

-- ── INVOICES ────────────────────────────────────────────────────
create table invoices (
  id             uuid primary key default uuid_generate_v4(),
  store_id       uuid references stores(id),
  created_by     uuid references profiles(id),
  invoice_number text not null,
  invoice_date   date not null default current_date,
  client_name    text not null,
  client_address text,
  po_number      text,
  description    text,
  qty            numeric default 1,
  unit_price     numeric not null,
  subtotal       numeric not null,
  gst            numeric not null,
  total          numeric not null,
  created_at     timestamptz default now()
);

-- ── NOTIFICATIONS ───────────────────────────────────────────────
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  message    text not null,
  is_read    boolean default false,
  created_at timestamptz default now()
);

-- Auto-notify manager when job done
create or replace function notify_manager_on_job_done()
returns trigger language plpgsql security definer as $$
declare
  mgr_id uuid; store uuid; client text;
begin
  if new.status = 'done' and old.status != 'done' then
    select store_id, client_name into store, client from jobs where id = new.id;
    select id into mgr_id from profiles where store_id = store and role = 'manager' limit 1;
    if mgr_id is not null then
      insert into notifications (user_id, message)
      values (mgr_id, 'Job for ' || client || ' has been marked complete.');
    end if;
  end if;
  return new;
end;
$$;

create trigger job_done_notify
  after update on jobs
  for each row execute procedure notify_manager_on_job_done();

-- ── ROW-LEVEL SECURITY ──────────────────────────────────────────
alter table stores         enable row level security;
alter table profiles       enable row level security;
alter table jobs           enable row level security;
alter table photos         enable row level security;
alter table job_checklist  enable row level security;
alter table invoices       enable row level security;
alter table notifications  enable row level security;

-- Stores: all authenticated users can read
create policy "stores_read" on stores for select using (auth.role() = 'authenticated');

-- Profiles: own row + managers see all
create policy "profiles_self"    on profiles for select using (auth.uid() = id);
create policy "profiles_manager" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'manager')
);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

-- Jobs: same store
create policy "jobs_read"   on jobs for select using (store_id = (select store_id from profiles where id = auth.uid()));
create policy "jobs_insert" on jobs for insert with check (store_id = (select store_id from profiles where id = auth.uid()));
create policy "jobs_update" on jobs for update using (store_id = (select store_id from profiles where id = auth.uid()));

-- Photos: same store jobs
create policy "photos_read"   on photos for select using (job_id in (select id from jobs where store_id = (select store_id from profiles where id = auth.uid())));
create policy "photos_insert" on photos for insert with check (uploaded_by = auth.uid());

-- Checklist: same store jobs
create policy "checklist_read"   on job_checklist for select using (job_id in (select id from jobs where store_id = (select store_id from profiles where id = auth.uid())));
create policy "checklist_insert" on job_checklist for insert with check (job_id in (select id from jobs where store_id = (select store_id from profiles where id = auth.uid())));
create policy "checklist_update" on job_checklist for update using (job_id in (select id from jobs where store_id = (select store_id from profiles where id = auth.uid())));

-- Invoices: same store
create policy "invoices_read"   on invoices for select using (store_id = (select store_id from profiles where id = auth.uid()));
create policy "invoices_insert" on invoices for insert with check (store_id = (select store_id from profiles where id = auth.uid()));

-- Notifications: own only
create policy "notif_read"   on notifications for select using (user_id = auth.uid());
create policy "notif_update" on notifications for update using (user_id = auth.uid());

-- ── STORAGE BUCKET ──────────────────────────────────────────────
-- Run these lines separately in Supabase Dashboard → SQL Editor:
--
-- insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', false);
-- create policy "photos_upload" on storage.objects for insert with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');
-- create policy "photos_view"   on storage.objects for select using  (bucket_id = 'job-photos' and auth.role() = 'authenticated');


-- ── JOB APPLICATIONS (hiring) ────────────────────────────────────────
-- Public form — no auth required to insert
create table job_applications (
  id                  uuid primary key default uuid_generate_v4(),
  -- Personal
  full_name           text not null,
  email               text not null,
  phone               text not null,
  city                text,
  -- Availability
  available_days      text[],
  available_hours     text,
  start_date          date,
  -- Experience
  work_experience     text,
  -- Details
  has_drivers_licence boolean default false,
  sin_number          text,
  -- Emergency contact
  emergency_name      text,
  emergency_phone     text,
  emergency_relation  text,
  -- References
  ref1_name           text,
  ref1_phone          text,
  ref1_relation       text,
  ref2_name           text,
  ref2_phone          text,
  ref2_relation       text,
  -- Resume + notes
  resume_path         text,
  cover_note          text,
  -- Status (manager updates this)
  status              text check (status in ('new','reviewed','interviewing','hired','rejected')) default 'new',
  created_at          timestamptz default now()
);

-- Allow anyone (no login) to submit an application
alter table job_applications enable row level security;
create policy "applications_public_insert" on job_applications
  for insert with check (true);

-- Only managers can read applications
create policy "applications_manager_read" on job_applications
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'manager')
  );

-- Only managers can update status
create policy "applications_manager_update" on job_applications
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'manager')
  );

-- Storage bucket for resumes
-- Run these separately in Supabase SQL Editor:
-- insert into storage.buckets (id, name, public) values ('job-applications', 'job-applications', false);
-- create policy "resume_upload_public" on storage.objects for insert with check (bucket_id = 'job-applications');
-- create policy "resume_read_manager"  on storage.objects for select using (bucket_id = 'job-applications' and auth.role() = 'authenticated');
