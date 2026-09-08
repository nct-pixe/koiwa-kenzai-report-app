# 光和建材 営業日報・週報Webアプリ

Next.js（App Router）＋ Supabase構成のMVP実装。要件は `../要件定義書.html`、DBスキーマ・画面仕様は `../詳細設計書.html` を参照。

## セットアップ

1. Supabaseプロジェクトを作成し、Project Settings > API から `Project URL` / `anon public key` / `service_role key` を控える
2. `.env.local.example` を `.env.local` にコピーし、上記の値を記入する
3. Supabase SQL Editorで `supabase/migrations/0001_init.sql` → `0002_report_tabs_and_performance.sql` → `0003_monthly_report_restructure.sql` → `0004_next_action_assignee.sql` の順に実行する（テーブル・RLSポリシー一式が作成される）
4. `scripts/seed-data.example.json` を `scripts/seed-data.json` にコピーし、実際の店舗・スタッフに書き換える
5. スタッフアカウントを発行する

   ```
   node --env-file=.env.local scripts/seed-staff.mjs
   ```

6. 開発サーバーを起動

   ```
   npm install
   npm run dev
   ```

7. `http://localhost:3000/login` に、seedスクリプトで発行した社員コード・パスワードでログインできることを確認する

## 認証方式

メールアドレスを使わず「社員コード＋パスワード」でログインする。内部的には `社員コード@<NEXT_PUBLIC_AUTH_DUMMY_DOMAIN>` のダミーメールに変換してSupabase Authを利用している（`lib/auth/staffCode.ts`）。

## 画面構成

| パス | 内容 | 対象ロール |
|---|---|---|
| `/login` | ログイン | 全員 |
| `/` | マイページ（個人の目標進捗・今週の日報） | 全員 |
| `/daily` | 日報（4タブ：今週の行動結果／報告事項／来週の行動予定／その他報告事項）。行動結果タブは先週の予定と突き合わせ表示 | 全員 |
| `/performance` | 実績報告（本日までの累計実績を入力。前年実績・今月目標は本部設定値を表示のみ） | 全員 |
| `/ranking` | 営業成績ランキング（売上実績・全員分） | 全員 |
| `/history` | 過去の日報検索（期間・担当者・キーワード） | 全員（staffは自分の日報のみ、manager/hqは範囲に応じて全員分） |
| `/hq` | 本部ダッシュボード（個人別・店舗別集計、未提出者） | manager / hq |
| `/hq/daily` | スタッフ一覧（実績・報告状況、個人詳細への導線） | manager / hq |
| `/hq/performance` | 実績報告一覧（全スタッフ・閲覧専用） | manager / hq |
| `/hq/targets` | 目標設定（前年実績・今月目標の登録） | manager / hq |

## 変更履歴（v0.4）

- 実績報告の週次（第1〜4週）入力を廃止し、「本日までの累計実績」を都度上書き入力する方式に変更。前年実績・今月目標はスタッフが編集できなくなり、`/hq/targets` で本部・店長のみが登録する運用に統一（`monthly_targets` にcategory列を追加）。
- 日報「今週の行動結果」タブに、先週入力した行動予定（`plan_items`）と今週の実績を突き合わせ表示し、達成状況を自動判定するように変更。
- 日報に構造化フィールド（訪問先・目的・対応者・反応・提案内容・進捗・課題・次のアクション・次回予定日）を追加（`daily_logs`、すべて任意入力）。
- `/hq/daily`（スタッフ一覧）と `/history`（過去日報検索）を新設し、一覧表示と個人詳細・過去分の閲覧を分離。
- `/ranking` を新設。`get_sales_ranking` RPC（security definer）で集計値のみを全スタッフに公開し、日報本文などの生データは非公開のまま維持。
- 日報の「次のアクション」を「次の行動／担当者／期限」の3項目セットに整理（`next_action_assignee`列を追加）。すべて営業担当者の手入力項目で、AIによる自動生成・自動要約は行わない。

## 未実装・今後の対応

- AIによる日報の自動要約（「次の行動」が分かる文章への整形）
- 店長による承認・コメント機能（Phase 2）
- スタッフアカウントの追加発行UI — 現状は `scripts/seed-staff.mjs` を再実行する運用
- パスワード再設定のUI — 現状はSupabaseダッシュボードから手動操作
- カレンダービュー、リマインド通知
