-- ============================================================
-- CleanTrack Database Schema
-- Run this entire file in Supabase SQL Editor → New Query → Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- STORES
-- Change the names and addresses below to your real branches!
-- ============================================================
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- STORES: Change these to your actual branch names and addresses
insert into stores (name, address) values
  ('Sunrise Branch', '101 Sunrise Blvd'),
  ('Lakewood Branch', '88 Lakewood Ave'),
  ('Hillcrest Branch', '45 Hillcrest Rd'),
  ('Riverdale Branch', '200 River Dr');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text default 'employee' check (role in ('employee', 'manager')),
  store_id uuid references stores(id),
  created_at timestamptz default now()
);

-- Auto-create profile when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'employee'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- JOBS
-- ============================================================
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  client_name text not null,
  location_detail text,
  assigned_to uuid references profiles(id),
  scheduled_time timestamptz,
  status text default 'pending' check (status in ('pending', 'in_progress', 'complete')),
  notes text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================================
-- CHECKLISTS
-- ============================================================
create table if not exists checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists checklist_items (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references checklist_templates(id) on delete cascade,
  label text not null,
  sort_order int default 0
);

create table if not exists job_checklist_progress (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  item_id uuid references checklist_items(id) on delete cascade,
  checked boolean default false,
  checked_by uuid references profiles(id),
  checked_at timestamptz,
  unique(job_id, item_id)
);

-- Default checklist template (applies to all stores)
insert into checklist_templates (name) values ('Standard Room Clean');

-- ============================================================
-- PHOTOS
-- ============================================================
create table if not exists job_photos (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  storage_path text not null,
  photo_type text default 'after' check (photo_type in ('before', 'after', 'other')),
  caption text,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references profiles(id) on delete cascade,
  message text not null,
  type text default 'job_complete',
  job_id uuid references jobs(id),
  read boolean default false,
  created_at timestamptz default now()
);

-- Function: notify all managers when a job is marked complete
create or replace function notify_managers_on_complete()
returns trigger as $$
declare
  manager record;
  job_client text;
begin
  if new.status = 'complete' and old.status != 'complete' then
    select client_name into job_client from jobs where id = new.id;
    for manager in
      select id from profiles where role = 'manager'
    loop
      insert into notifications (recipient_id, message, type, job_id)
      values (
        manager.id,
        'Job "' || job_client || '" has been marked complete.',
        'job_complete',
        new.id
      );
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_job_complete on jobs;
create trigger on_job_complete
  after update on jobs
  for each row execute function notify_managers_on_complete();

-- ============================================================
-- ROW LEVEL SECURITY (keeps data safe)
-- ============================================================
alter table stores enable row level security;
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table job_photos enable row level security;
alter table notifications enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_items enable row level security;
alter table job_checklist_progress enable row level security;

-- Stores: everyone logged in can read
create policy "Stores readable by authenticated" on stores
  for select using (auth.role() = 'authenticated');

-- Profiles: users see their own; managers see all
create policy "Profiles: own or manager" on profiles
  for select using (
    auth.uid() = id or
    exists (select 1 from profiles where id = auth.uid() and role = 'manager')
  );

create policy "Profiles: update own" on profiles
  for update using (auth.uid() = id);

-- Jobs: employees see jobs at their store; managers see all
create policy "Jobs: store employees or manager" on jobs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and (store_id = jobs.store_id or role = 'manager'))
  );

create policy "Jobs: insert by authenticated" on jobs
  for insert with check (auth.role() = 'authenticated');

create policy "Jobs: update by authenticated" on jobs
  for update using (auth.role() = 'authenticated');

-- Photos: same as jobs
create policy "Photos: store employees or manager" on job_photos
  for select using (
    exists (
      select 1 from jobs j
      join profiles p on p.id = auth.uid()
      where j.id = job_photos.job_id and (p.store_id = j.store_id or p.role = 'manager')
    )
  );

create policy "Photos: insert by authenticated" on job_photos
  for insert with check (auth.role() = 'authenticated');

-- Notifications: users see their own
create policy "Notifications: own only" on notifications
  for select using (recipient_id = auth.uid());

create policy "Notifications: update own" on notifications
  for update using (recipient_id = auth.uid());

-- Checklists: readable by all authenticated
create policy "Checklist templates: authenticated" on checklist_templates
  for select using (auth.role() = 'authenticated');

create policy "Checklist items: authenticated" on checklist_items
  for select using (auth.role() = 'authenticated');

create policy "Checklist progress: authenticated" on job_checklist_progress
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- SAMPLE DATA (optional — delete if you don't want demo data)
-- ============================================================

-- Sample checklist items for Standard Room Clean
insert into checklist_items (template_id, label, sort_order)
select t.id, items.label, items.ord
from checklist_templates t,
(values
  ('Strip and replace bed linens', 1),
  ('Vacuum all carpeted areas', 2),
  ('Wipe all surfaces and desk', 3),
  ('Clean and disinfect bathroom', 4),
  ('Restock towels and toiletries', 5),
  ('Empty all bins and replace liners', 6),
  ('Final walkthrough and photo', 7)
) as items(label, ord)
where t.name = 'Standard Room Clean';
