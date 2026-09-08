-- 光和建材 営業日報・週報Webアプリ 初期スキーマ
-- 詳細設計書 v0.2 に対応

create extension if not exists "pgcrypto";

create type staff_role as enum ('staff', 'manager', 'hq');
create type report_category as enum ('失敗談', '成功談', '市況情報', 'クレーム', 'その他');

-- ============================================================
-- テーブル
-- ============================================================

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  staff_code text not null unique,
  name text not null,
  role staff_role not null default 'staff',
  store_id uuid not null references stores(id),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  log_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (staff_id, log_date)
);

create table report_items (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  week_start date not null,
  category report_category not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table plan_items (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  plan_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (staff_id, plan_date)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  week_start date not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  store_id uuid not null references stores(id),
  deal_date date not null,
  deal_name text not null,
  sales_amount numeric(12, 0) not null default 0,
  profit_amount numeric(12, 0) not null default 0,
  created_at timestamptz not null default now()
);

create table monthly_targets (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  target_month date not null, -- 月初日（例: 2026-07-01）
  sales_target numeric(12, 0) not null default 0,
  profit_target numeric(12, 0) not null default 0,
  prev_year_sales numeric(12, 0),
  set_by uuid references staff(id),
  created_at timestamptz not null default now(),
  unique (staff_id, target_month)
);

create index on daily_logs (staff_id, log_date);
create index on plan_items (staff_id, plan_date);
create index on deals (staff_id, deal_date);
create index on deals (store_id, deal_date);
create index on monthly_targets (staff_id, target_month);

-- ============================================================
-- RLS用ヘルパー関数（recursion回避のため security definer）
-- ============================================================

create or replace function current_staff_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from staff where auth_user_id = auth.uid();
$$;

create or replace function current_staff_role()
returns staff_role
language sql
security definer
stable
set search_path = public
as $$
  select role from staff where auth_user_id = auth.uid();
$$;

create or replace function current_staff_store_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select store_id from staff where auth_user_id = auth.uid();
$$;

-- ============================================================
-- RLS 有効化
-- ============================================================

alter table stores enable row level security;
alter table staff enable row level security;
alter table daily_logs enable row level security;
alter table report_items enable row level security;
alter table plan_items enable row level security;
alter table topics enable row level security;
alter table deals enable row level security;
alter table monthly_targets enable row level security;

-- stores / staff: 全ログインユーザー閲覧可、書き込みは本部のみ
create policy "stores_select_all" on stores for select
  using (auth.uid() is not null);
create policy "stores_write_hq" on stores for all
  using (current_staff_role() = 'hq')
  with check (current_staff_role() = 'hq');

create policy "staff_select_all" on staff for select
  using (auth.uid() is not null);
create policy "staff_write_hq" on staff for all
  using (current_staff_role() = 'hq')
  with check (current_staff_role() = 'hq');

-- daily_logs / report_items / plan_items / topics / deals:
-- 本人は自分の行を読み書き可。店長は自店舗スタッフの行を閲覧可。本部は全件閲覧可。
create policy "daily_logs_own_rw" on daily_logs for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());
create policy "daily_logs_manager_read" on daily_logs for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "daily_logs_hq_read" on daily_logs for select
  using (current_staff_role() = 'hq');

create policy "report_items_own_rw" on report_items for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());
create policy "report_items_manager_read" on report_items for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "report_items_hq_read" on report_items for select
  using (current_staff_role() = 'hq');

create policy "plan_items_own_rw" on plan_items for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());
create policy "plan_items_manager_read" on plan_items for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "plan_items_hq_read" on plan_items for select
  using (current_staff_role() = 'hq');

create policy "topics_own_rw" on topics for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());
create policy "topics_manager_read" on topics for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "topics_hq_read" on topics for select
  using (current_staff_role() = 'hq');

create policy "deals_own_rw" on deals for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());
create policy "deals_manager_read" on deals for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "deals_hq_read" on deals for select
  using (current_staff_role() = 'hq');

-- monthly_targets: 本人は閲覧のみ。店長は自店舗分を読み書き可。本部は全件読み書き可。
create policy "monthly_targets_own_read" on monthly_targets for select
  using (staff_id = current_staff_id());
create policy "monthly_targets_manager_rw" on monthly_targets for all
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  )
  with check (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "monthly_targets_hq_rw" on monthly_targets for all
  using (current_staff_role() = 'hq')
  with check (current_staff_role() = 'hq');
