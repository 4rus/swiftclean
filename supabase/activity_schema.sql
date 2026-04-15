-- ── ACTIVITY LOG ─────────────────────────────────────────────────────
-- Tracks employee login/logout events
create table if not exists activity_log (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  store_id   uuid references stores(id),
  event      text check (event in ('login', 'logout')),
  created_at timestamptz default now()
);

alter table activity_log enable row level security;

-- Employees can insert their own events
create policy "activity_insert" on activity_log
  for insert with check (user_id = auth.uid());

-- Managers can read all activity
create policy "activity_manager_read" on activity_log
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'manager')
  );

-- Also update stores table with correct GPS coords
update stores set lat = 51.15547962403082,  lng = -114.06045633856486 where name like '%Country Hills%' and name like '%Swiss%';
update stores set lat = 51.110903357884574, lng = -113.98118987414938  where name like '%Bahubali%';
update stores set lat = 51.132182792486645, lng = -113.96528790434027  where name like '%Explode%';
update stores set lat = 51.15361165528103,  lng = -113.97560920298321  where name like '%Mumbaayai%';
update stores set lat = 51.13285411491811,  lng = -113.94799040089555  where name like '%Savanna%';
update stores set lat = 51.15609853398679,  lng = -113.95048636065593  where name like '%Skyview%';
update stores set lat = 51.16602742095543,  lng = -113.95711206065533  where name like '%Redstone%';
