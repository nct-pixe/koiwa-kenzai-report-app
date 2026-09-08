-- 光和建材 営業日報・週報Webアプリ 追加スキーマ (v0.4)
-- 月次実績の週別入力廃止／前年実績・目標の本部一元管理／日報の構造化／全員閲覧ランキングに対応

-- ============================================================
-- monthly_targets: category対応（スタッフ実績／パネル実績を分離して本部が登録）
-- ============================================================

alter table monthly_targets add column category performance_category not null default 'general';
alter table monthly_targets add column prev_year_profit numeric(12, 0);

alter table monthly_targets drop constraint monthly_targets_staff_id_target_month_key;
alter table monthly_targets add constraint monthly_targets_staff_id_target_month_category_key
  unique (staff_id, target_month, category);

-- ============================================================
-- performance_reports: 週次4本＋着地予測を廃止し、累計実績のみに簡素化
-- 目標・前年実績は monthly_targets に一元化（重複排除）
-- ============================================================

alter table performance_reports add column cumulative_sales numeric(12, 0) not null default 0;
alter table performance_reports add column cumulative_profit numeric(12, 0) not null default 0;

update performance_reports set
  cumulative_sales = week1_sales + week2_sales + week3_sales + week4_sales,
  cumulative_profit = week1_profit + week2_profit + week3_profit + week4_profit;

alter table performance_reports
  drop column week1_sales,
  drop column week1_profit,
  drop column week2_sales,
  drop column week2_profit,
  drop column week3_sales,
  drop column week3_profit,
  drop column week4_sales,
  drop column week4_profit,
  drop column forecast_sales,
  drop column forecast_profit,
  drop column sales_target,
  drop column profit_target,
  drop column prev_year_sales,
  drop column prev_year_profit;

-- ============================================================
-- daily_logs: 行動内容の構造化フィールド追加（すべて任意入力）
-- ============================================================

alter table daily_logs add column customer_name text;
alter table daily_logs add column purpose text;
alter table daily_logs add column contact_person text;
alter table daily_logs add column customer_reaction text;
alter table daily_logs add column proposal_content text;
alter table daily_logs add column progress_status text;
alter table daily_logs add column issues text;
alter table daily_logs add column next_action text;
alter table daily_logs add column next_visit_date date;

-- ============================================================
-- 全員閲覧可能な売上ランキングRPC（集計値のみを公開、日報本文などは非公開のまま）
-- ============================================================

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
