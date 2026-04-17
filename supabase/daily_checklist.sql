-- ================================================================
-- Daily Checklist Tables
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Manager-created checklist items per store (persist indefinitely)
create table if not exists daily_checklist_templates (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid references stores(id) on delete cascade not null,
  item_label text not null,
  position   int default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Per-day employee completions (one row per item per day — resets automatically each new day)
create table if not exists daily_checklist_completions (
  id          uuid primary key default uuid_generate_v4(),
  template_id uuid references daily_checklist_templates(id) on delete cascade not null,
  store_id    uuid references stores(id) not null,
  date        date not null default current_date,
  is_done     boolean default false,
  done_by     uuid references profiles(id),
  done_at     timestamptz,
  unique(template_id, date)
);

-- RLS
alter table daily_checklist_templates enable row level security;
alter table daily_checklist_completions enable row level security;

-- Templates: managers can do everything; employees can read their own store's items
create policy "dct_read" on daily_checklist_templates
  for select using (
    store_id = (select store_id from profiles where id = auth.uid())
    or (select role from profiles where id = auth.uid()) = 'manager'
  );

create policy "dct_insert" on daily_checklist_templates
  for insert with check ((select role from profiles where id = auth.uid()) = 'manager');

create policy "dct_update" on daily_checklist_templates
  for update using ((select role from profiles where id = auth.uid()) = 'manager');

create policy "dct_delete" on daily_checklist_templates
  for delete using ((select role from profiles where id = auth.uid()) = 'manager');

-- Completions: employees and managers can read/write for their store
create policy "dcc_read" on daily_checklist_completions
  for select using (
    store_id = (select store_id from profiles where id = auth.uid())
    or (select role from profiles where id = auth.uid()) = 'manager'
  );

create policy "dcc_insert" on daily_checklist_completions
  for insert with check (
    store_id = (select store_id from profiles where id = auth.uid())
    or (select role from profiles where id = auth.uid()) = 'manager'
  );

create policy "dcc_update" on daily_checklist_completions
  for update using (
    store_id = (select store_id from profiles where id = auth.uid())
    or (select role from profiles where id = auth.uid()) = 'manager'
  );
