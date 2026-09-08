-- 光和建材 営業日報・週報Webアプリ 追加スキーマ (v0.9)
-- 店舗タイプ（本社／営業所）を追加。目標設定は「本社」所属の店長・本部管理者のみ操作可能にする。
-- 店舗名（本社・仙台店・郡山店）はそのまま維持し、タイプ分類のみ追加する。

create type store_type as enum ('headquarters', 'branch');

alter table stores add column type store_type not null default 'branch';
update stores set type = 'headquarters' where name = '本社';

-- ============================================================
-- RLS用ヘルパー関数：ログイン中スタッフの所属店舗タイプ
-- ============================================================

create or replace function current_staff_store_type()
returns store_type
language sql
security definer
stable
set search_path = public
as $$
  select st.type
  from staff s
  join stores st on st.id = s.store_id
  where s.auth_user_id = auth.uid();
$$;

-- ============================================================
-- monthly_targets の書込権限を「本社所属の店長・本部管理者」のみに統一
-- （従来は manager=自店舗のみ／hq=全店舗、の2ポリシーだったものを1つに統合）
-- ============================================================

drop policy if exists "monthly_targets_manager_rw" on monthly_targets;
drop policy if exists "monthly_targets_hq_rw" on monthly_targets;

create policy "monthly_targets_headquarters_rw" on monthly_targets for all
  using (
    current_staff_role() in ('manager', 'hq')
    and current_staff_store_type() = 'headquarters'
  )
  with check (
    current_staff_role() in ('manager', 'hq')
    and current_staff_store_type() = 'headquarters'
  );
