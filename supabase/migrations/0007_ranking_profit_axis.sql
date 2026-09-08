-- 光和建材 営業日報・週報Webアプリ 追加スキーマ (v0.8)
-- ランキングの並び順を「利益」基準に変更する（売上は利益に紐づく形で表示）
-- get_sales_ranking / get_store_ranking を、利益順に並び替えた get_profit_ranking / get_store_profit_ranking に置き換える

drop function if exists get_sales_ranking(date);
drop function if exists get_store_ranking(date);

create or replace function get_profit_ranking(p_target_month date)
returns table (
  staff_id uuid,
  name text,
  store_name text,
  cumulative_profit numeric,
  profit_target numeric,
  prev_year_profit numeric,
  profit_achievement_pct numeric,
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
    coalesce(pr.cumulative_profit, 0),
    mt.profit_target,
    mt.prev_year_profit,
    case when mt.profit_target > 0 then round(coalesce(pr.cumulative_profit, 0) / mt.profit_target * 100, 1) else null end,
    coalesce(pr.cumulative_sales, 0),
    mt.sales_target,
    mt.prev_year_sales,
    case when mt.sales_target > 0 then round(coalesce(pr.cumulative_sales, 0) / mt.sales_target * 100, 1) else null end,
    rank() over (order by coalesce(pr.cumulative_profit, 0) desc)
  from staff s
  join stores st on st.id = s.store_id
  left join performance_reports pr
    on pr.staff_id = s.id and pr.target_month = p_target_month and pr.category = 'general'
  left join monthly_targets mt
    on mt.staff_id = s.id and mt.target_month = p_target_month and mt.category = 'general'
  where s.active
  order by coalesce(pr.cumulative_profit, 0) desc;
$$;

grant execute on function get_profit_ranking(date) to authenticated;

create or replace function get_store_profit_ranking(p_target_month date)
returns table (
  store_id uuid,
  store_name text,
  cumulative_profit numeric,
  profit_target numeric,
  prev_year_profit numeric,
  profit_achievement_pct numeric,
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
    coalesce(sum(pr.cumulative_profit), 0) as cumulative_profit,
    coalesce(sum(mt.profit_target), 0) as profit_target,
    coalesce(sum(mt.prev_year_profit), 0) as prev_year_profit,
    case when sum(mt.profit_target) > 0
      then round(coalesce(sum(pr.cumulative_profit), 0) / sum(mt.profit_target) * 100, 1)
      else null
    end as profit_achievement_pct,
    coalesce(sum(pr.cumulative_sales), 0) as cumulative_sales,
    coalesce(sum(mt.sales_target), 0) as sales_target,
    coalesce(sum(mt.prev_year_sales), 0) as prev_year_sales,
    case when sum(mt.sales_target) > 0
      then round(coalesce(sum(pr.cumulative_sales), 0) / sum(mt.sales_target) * 100, 1)
      else null
    end as achievement_pct,
    rank() over (order by coalesce(sum(pr.cumulative_profit), 0) desc)
  from stores st
  join staff s on s.store_id = st.id and s.active
  left join performance_reports pr
    on pr.staff_id = s.id and pr.target_month = p_target_month and pr.category = 'general'
  left join monthly_targets mt
    on mt.staff_id = s.id and mt.target_month = p_target_month and mt.category = 'general'
  group by st.id, st.name
  order by cumulative_profit desc;
$$;

grant execute on function get_store_profit_ranking(date) to authenticated;
