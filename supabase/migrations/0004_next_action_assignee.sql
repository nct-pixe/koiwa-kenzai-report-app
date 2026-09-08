-- 光和建材 営業日報・週報Webアプリ 追加スキーマ (v0.5)
-- 「次の行動」に担当者を紐づけられるように追加（AIによる自動生成は行わず、営業担当者の手入力項目）

alter table daily_logs add column next_action_assignee text;
