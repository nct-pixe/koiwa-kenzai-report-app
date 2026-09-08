-- 光和建材 営業日報・週報Webアプリ 追加スキーマ (v0.6)
-- 打ち合わせ議事録に基づく修正：
--   ⑤ パネル実績をDBごと完全削除
--   ⑬ 成功談・失敗談を全スタッフが閲覧可能に
--   ⑩ 店舗ランキングRPC追加
--   ⑭ 店舗別売上推移（日次・月次）のためのスナップショット記録とRPC追加

-- ============================================================
-- ⑤ パネル実績の完全削除
-- ============================================================

delete from performance_reports where category = 'panel';
delete from monthly_targets where category = 'panel';

create type performance_category_new as enum ('general');

alter table performance_reports alter column category type performance_category_new using category::text::performance_category_new;
alter table monthly_targets alter column category type performance_category_new using category::text::performance_category_new;

drop type performance_category;
alter type performance_category_new rename to performance_category;

alter table performance_reports alter column category set default 'general';
alter table monthly_targets alter column category set default 'general';

-- ============================================================
-- ⑬ 成功談・失敗談は全スタッフが閲覧可能（それ以外のカテゴリは従来通り本人・自店舗店長・本部のみ）
-- ============================================================

create policy "report_items_public_stories_read" on report_items for select
  using (category in ('成功談', '失敗談'));

-- ============================================================
-- ⑩ 店舗ランキングRPC（全スタッフ閲覧可、集計値のみ公開）
-- ============================================================

create or replace function get_store_ranking(p_target_month date)
returns table (
  store_id uuid,
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
    st.id,
    st.name,
    coalesce(sum(pr.cumulative_sales), 0) as cumulative_sales,
    coalesce(sum(mt.sales_target), 0) as sales_target,
    coalesce(sum(mt.prev_year_sales), 0) as prev_year_sales,
    case when sum(mt.sales_target) > 0
      then round(coalesce(sum(pr.cumulative_sales), 0) / sum(mt.sales_target) * 100, 1)
      else null
    end as achievement_pct,
    rank() over (order by coalesce(sum(pr.cumulative_sales), 0) desc)
  from stores st
  join staff s on s.store_id = st.id and s.active
  left join performance_reports pr
    on pr.staff_id = s.id and pr.target_month = p_target_month and pr.category = 'general'
  left join monthly_targets mt
    on mt.staff_id = s.id and mt.target_month = p_target_month and mt.category = 'general'
  group by st.id, st.name
  order by cumulative_sales desc;
$$;

grant execute on function get_store_ranking(date) to authenticated;

-- ============================================================
-- ⑭ 店舗別売上推移：日次スナップショットの自動記録
-- ============================================================

create table performance_report_daily (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  target_month date not null,
  snapshot_date date not null default current_date,
  cumulative_sales numeric(12, 0) not null default 0,
  cumulative_profit numeric(12, 0) not null default 0,
  unique (staff_id, target_month, snapshot_date)
);

create index on performance_report_daily (target_month, snapshot_date);

alter table performance_report_daily enable row level security;

create policy "performance_report_daily_own_read" on performance_report_daily for select
  using (staff_id = current_staff_id());
create policy "performance_report_daily_manager_read" on performance_report_daily for select
  using (
    current_staff_role() = 'manager'
    and staff_id in (select id from staff where store_id = current_staff_store_id())
  );
create policy "performance_report_daily_hq_read" on performance_report_daily for select
  using (current_staff_role() = 'hq');

create or replace function record_performance_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into performance_report_daily (staff_id, target_month, snapshot_date, cumulative_sales, cumulative_profit)
  values (new.staff_id, new.target_month, current_date, new.cumulative_sales, new.cumulative_profit)
  on conflict (staff_id, target_month, snapshot_date)
  do update set cumulative_sales = excluded.cumulative_sales, cumulative_profit = excluded.cumulative_profit;
  return new;
end;
$$;

create trigger performance_reports_snapshot
after insert or update of cumulative_sales, cumulative_profit on performance_reports
for each row
execute function record_performance_snapshot();

-- ============================================================
-- ⑭ 店舗別売上推移RPC（本部・店長のみ。本人以外の店舗は本部のみ閲覧可）
-- ============================================================

create or replace function get_store_monthly_trend(p_store_id uuid, p_months int default 6)
returns table (
  target_month date,
  sales_actual numeric,
  sales_target numeric,
  prev_year_sales numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    mt.target_month,
    coalesce(sum(pr.cumulative_sales), 0),
    coalesce(sum(mt.sales_target), 0),
    coalesce(sum(mt.prev_year_sales), 0)
  from monthly_targets mt
  join staff s on s.id = mt.staff_id
  left join performance_reports pr
    on pr.staff_id = mt.staff_id and pr.target_month = mt.target_month and pr.category = 'general'
  where mt.category = 'general'
    and s.store_id = p_store_id
    and mt.target_month >= (date_trunc('month', now()) - (p_months || ' months')::interval)::date
    and current_staff_role() in ('hq', 'manager')
    and (current_staff_role() = 'hq' or p_store_id = current_staff_store_id())
  group by mt.target_month
  order by mt.target_month;
$$;

grant execute on function get_store_monthly_trend(uuid, int) to authenticated;

create or replace function get_store_daily_trend(p_store_id uuid, p_target_month date)
returns table (
  snapshot_date date,
  sales_actual numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    prd.snapshot_date,
    sum(prd.cumulative_sales)
  from performance_report_daily prd
  join staff s on s.id = prd.staff_id
  where s.store_id = p_store_id
    and prd.target_month = p_target_month
    and current_staff_role() in ('hq', 'manager')
    and (current_staff_role() = 'hq' or p_store_id = current_staff_store_id())
  group by prd.snapshot_date
  order by prd.snapshot_date;
$$;

grant execute on function get_store_daily_trend(uuid, date) to authenticated;
