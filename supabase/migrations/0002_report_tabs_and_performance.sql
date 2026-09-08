-- 光和建材 営業日報・週報Webアプリ 追加スキーマ (v0.3)
-- 日報ページ4タブ再編・実績報告機能追加に対応

-- ============================================================
-- report_items のカテゴリ拡張（報告事項タブ）
-- ============================================================

alter type report_category add value if not exists '会合';
alter type report_category add value if not exists 'メーカー情報';

-- ============================================================
-- topics にカテゴリ追加（その他報告事項タブ）
-- ============================================================

create type topic_category as enum ('イベント情報', '課題', '問題点', '改善策', 'その他');

alter table topics add column category topic_category not null default 'その他';
alter table topics alter column category drop default;

-- ============================================================
-- 実績報告（案件登録に代わる週次直接入力）
-- ============================================================

create type performance_category as enum ('general', 'panel');

create table performance_reports (
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

create index on performance_reports (staff_id, target_month);

alter table performance_reports enable row level security;

create policy "performance_reports_own_rw" on performance_reports for all
  using (staff_id = current_staff_id())
  with check (staff_id = current_staff_id());
create policy "performance_reports_manager_read" on performance_reports for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "performance_reports_hq_read" on performance_reports for select
  using (current_staff_role() = 'hq');
