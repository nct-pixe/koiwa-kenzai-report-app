-- combined_migration.sql（べき等版）
-- 0002〜0004の内容を、現在のDB状態に関わらず何度実行してもエラーにならない形でまとめたもの。
-- 「型/テーブル/列/制約/ポリシーが既にある場合はスキップ」という判定を各ステートメントに入れている。

-- ============================================================
-- 0002_report_tabs_and_performance.sql 相当
-- ============================================================

alter type report_category add value if not exists '会合';
alter type report_category add value if not exists 'メーカー情報';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'topic_category') then
    create type topic_category as enum ('イベント情報', '課題', '問題点', '改善策', 'その他');
  end if;
end$$;

alter table topics add column if not exists category topic_category not null default 'その他';
alter table topics alter column category drop default;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'performance_category') then
    create type performance_category as enum ('general', 'panel');
  end if;
end$$;

create table if not exists performance_reports (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  target_month date not null, -- 月初日（例: 2026-07-01）
  category performance_category not null,
  sales_target numeric(12, 0),
  profit_target numeric(12, 0),
  prev_year_sales numeric(12, 0),
  prev_year_profit numeric(12, 0),
  week1_sales numeric(12, 0) not null default 0,
  week1_profit numeric(12, 0) not null default 0,
  week2_sales numeric(12, 0) not null default 0,
  week2_profit numeric(12, 0) not null default 0,
  week3_sales numeric(12, 0) not null default 0,
  week3_profit numeric(12, 0) not null default 0,
  week4_sales numeric(12, 0) not null default 0,
  week4_profit numeric(12, 0) not null default 0,
  forecast_sales numeric(12, 0) not null default 0,
  forecast_profit numeric(12, 0) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, target_month, category)
);

create index if not exists performance_reports_staff_id_target_month_idx
  on performance_reports (staff_id, target_month);

alter table performance_reports enable row level security;

drop policy if exists "performance_reports_own_rw" on performance_reports;
create policy "performance_reports_own_rw" on performance_reports for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());

drop policy if exists "performance_reports_manager_read" on performance_reports;
create policy "performance_reports_manager_read" on performance_reports for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );

drop policy if exists "performance_reports_hq_read" on performance_reports;
create policy "performance_reports_hq_read" on performance_reports for select
  using (current_staff_role() = 'hq');


-- ============================================================
-- 0003_monthly_report_restructure.sql 相当
-- ============================================================

-- monthly_targets: category対応（スタッフ実績／パネル実績を分離して本部が登録）
alter table monthly_targets add column if not exists category performance_category not null default 'general';
alter table monthly_targets add column if not exists prev_year_profit numeric(12, 0);

alter table monthly_targets drop constraint if exists monthly_targets_staff_id_target_month_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'monthly_targets_staff_id_target_month_category_key'
  ) then
    alter table monthly_targets add constraint monthly_targets_staff_id_target_month_category_key
      unique (staff_id, target_month, category);
  end if;
end$$;

-- performance_reports: 週次4本＋着地予測を廃止し、累計実績のみに簡素化
alter table performance_reports add column if not exists cumulative_sales numeric(12, 0) not null default 0;
alter table performance_reports add column if not exists cumulative_profit numeric(12, 0) not null default 0;

-- 旧・週次列がまだ残っている場合のみ、累計実績へ合算して引き継ぐ
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'performance_reports' and column_name = 'week1_sales'
  ) then
    update performance_reports set
      cumulative_sales = week1_sales + week2_sales + week3_sales + week4_sales,
      cumulative_profit = week1_profit + week2_profit + week3_profit + week4_profit;
  end if;
end$$;

alter table performance_reports drop column if exists week1_sales;
alter table performance_reports drop column if exists week1_profit;
alter table performance_reports drop column if exists week2_sales;
alter table performance_reports drop column if exists week2_profit;
alter table performance_reports drop column if exists week3_sales;
alter table performance_reports drop column if exists week3_profit;
alter table performance_reports drop column if exists week4_sales;
alter table performance_reports drop column if exists week4_profit;
alter table performance_reports drop column if exists forecast_sales;
alter table performance_reports drop column if exists forecast_profit;
alter table performance_reports drop column if exists sales_target;
alter table performance_reports drop column if exists profit_target;
alter table performance_reports drop column if exists prev_year_sales;
alter table performance_reports drop column if exists prev_year_profit;

-- daily_logs: 行動内容の構造化フィールド追加（すべて任意入力）
alter table daily_logs add column if not exists customer_name text;
alter table daily_logs add column if not exists purpose text;
alter table daily_logs add column if not exists contact_person text;
alter table daily_logs add column if not exists customer_reaction text;
alter table daily_logs add column if not exists proposal_content text;
alter table daily_logs add column if not exists progress_status text;
alter table daily_logs add column if not exists issues text;
alter table daily_logs add column if not exists next_action text;
alter table daily_logs add column if not exists next_visit_date date;

-- 全員閲覧可能な売上ランキングRPC（create or replaceのため元々べき等）
create or replace function get_sales_ranking(p_target_month date)
returns table (
  staff_id uuid,
  name text,
  store_name text,
  cumulative_sales numeric,
  sales_target numeric,
  prev_year_sales numeric,
  achievement_pct numeric,
  rank bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id,
    s.name,
    st.name,
    coalesce(pr.cumulative_sales, 0),
    mt.sales_target,
    mt.prev_year_sales,
    case when mt.sales_target > 0 then round(coalesce(pr.cumulative_sales, 0) / mt.sales_target * 100, 1) else null end,
    rank() over (order by coalesce(pr.cumulative_sales, 0) desc)
  from staff s
  join stores st on st.id = s.store_id
  left join performance_reports pr
    on pr.staff_id = s.id and pr.target_month = p_target_month and pr.category = 'general'
  left join monthly_targets mt
    on mt.staff_id = s.id and mt.target_month = p_target_month and mt.category = 'general'
  where s.active
  order by coalesce(pr.cumulative_sales, 0) desc;
$$;

grant execute on function get_sales_ranking(date) to authenticated;


-- ============================================================
-- 0004_next_action_assignee.sql 相当
-- ============================================================

alter table daily_logs add column if not exists next_action_assignee text;
