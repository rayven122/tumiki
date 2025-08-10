# オフライン移行ガイド

## 🎯 概要

本番環境のデータベースを個人組織モデルに移行するためのオフライン移行手順書です。
この手順では、メンテナンスモードでサービスを一時停止し、確実にデータ移行を実施します。

## ⚠️ 重要な前提条件

- **メンテナンス時間**: 約30-60分（データ量による）
- **必要な権限**: データベース管理者権限、本番環境へのデプロイ権限
- **必要なツール**: `pnpm`、データベース管理GUI（Supabase Dashboard等）

## 📋 事前準備チェックリスト

- [ ] メンテナンス時間の告知完了
- [ ] バックアップ用データベースの準備
- [ ] 移行スクリプトの動作確認（ステージング環境）
- [ ] ロールバック手順の確認
- [ ] 関係者への連絡

## 🚀 移行手順

### ステップ1: メンテナンスモード開始

```bash
# メンテナンスページを有効化
# Vercelでメンテナンスモードを有効化、またはNginx等で設定
# 注意: アプリケーションの停止は不要（pnpm run deployが自動的に処理）
```

### ステップ2: データベースバックアップ

#### GUI（Supabase Dashboard等）を使用してバックアップ

1. **データベース管理画面にアクセス**
   - Supabase Dashboard、pgAdmin、またはその他のGUIツールを開く

2. **バックアップDBを作成**
   - 新しいデータベースインスタンスを作成（例: `tumiki_backup_20250810`）
   - 本番環境と同じリージョンに作成することを推奨

3. **データをエクスポート・インポート**
   - 本番DBから全テーブルデータをエクスポート
   - バックアップDBにインポート
   - GUI上でテーブル単位またはデータベース全体のバックアップ機能を使用

4. **接続情報を記録**
   ```bash
   # バックアップDB接続URLを環境変数に設定
   export BACKUP_DATABASE_URL="postgresql://user:pass@host:5432/tumiki_backup_20250810"
   ```

### ステップ3: 本番DBリセットとスキーマ更新

#### GUIでデータベースをリセット

1. **データベース管理画面で全テーブルを削除**
   - ⚠️ **重要**: バックアップが完了していることを再確認
   - GUI上で全テーブルを選択して削除（CASCADE オプションを使用）

2. **新しいスキーマを適用**
   ```bash
   cd packages/db
   
   # Prismaスキーマから新しいテーブル構造を作成
   # これにより organizationId が必須フィールドとして作成されます
   pnpm db:deploy
   ```

### ステップ4: データ移行スクリプト実行

```bash
# 1. 環境変数を設定
export BACKUP_DATABASE_URL="postgresql://..." # バックアップDB
export DATABASE_URL="postgresql://..."        # 本番DB（移行先）

# 2. オフライン移行スクリプトを実行
pnpm tsx packages/scripts/src/migration-completed/offline-migration.ts

# 3. 移行結果を検証
pnpm tsx packages/scripts/src/migration-completed/verify-migration.ts
```

### ステップ5: アプリケーションデプロイ

```bash
# pnpm run deploy コマンドで以下が自動実行されます：
# - データベースマイグレーション
# - 環境変数の更新
# - Managerアプリケーション（Vercel）へのデプロイ
# - ProxyServer（GCE）へのデプロイ
# - 自動的なプロセス管理とヘルスチェック

pnpm run deploy
```

### ステップ6: 動作確認

```bash
# 1. デプロイステータスの確認
# pnpm run deploy の出力を確認

# 2. アプリケーション動作確認
# - 既存ユーザーのログイン
# - MCPサーバー一覧の表示
# - 新規ユーザー登録（個人組織の自動作成）

# 3. ログの確認（必要に応じて）
# Vercel: Vercelダッシュボードのログを確認
# ProxyServer: GCEコンソールでログを確認
```

### ステップ7: メンテナンスモード解除

```bash
# メンテナンスページを無効化
# Vercelのメンテナンスモードを解除、またはNginx設定を変更

# デプロイが正常に完了していることを最終確認
```

## 🔴 ロールバック手順

移行に失敗した場合の緊急ロールバック手順：

### 1. アプリケーションの確認
```bash
# デプロイ状態の確認（アプリケーション停止は不要）
```

### 2. GUIでデータベースを復元

1. **データベース管理画面にアクセス**
2. **本番DBの全テーブルを削除**（CASCADE オプション使用）
3. **バックアップDBから復元**
   - バックアップDBから全テーブルデータをエクスポート
   - 本番DBにインポート
   - またはGUIのデータベース復元機能を使用

### 3. 前のバージョンのコードに戻してデプロイ
```bash
# mainブランチに戻す
git checkout main
pnpm install

# 前のバージョンをデプロイ
pnpm run deploy
```

## 📊 移行の確認ポイント

### データ整合性の確認

#### 検証スクリプトを実行
```bash
# 自動検証スクリプトで詳細な確認
pnpm tsx packages/scripts/src/migration-completed/verify-migration.ts
```

#### GUIで手動確認（オプション）

データベース管理画面で以下を確認：

1. **User テーブル**
   - 全ユーザーが `defaultOrganizationId` を持つ
   
2. **Organization テーブル**
   - 個人組織（`isPersonal = true`）が存在する
   - 各個人組織の `maxMembers = 1`
   
3. **OrganizationMember テーブル**
   - 全ユーザーが少なくとも1つの組織に所属
   
4. **MCP関連テーブル**
   - `UserMcpServerConfig`、`UserToolGroup`、`UserMcpServerInstance` の全レコードが `organizationId` を持つ
   - `userId` カラムが存在しないことを確認

### アプリケーション動作確認

- [ ] 既存ユーザーがログインできる
- [ ] MCPサーバー一覧が表示される
- [ ] 新規MCPサーバーを追加できる
- [ ] 新規ユーザー登録時に個人組織が作成される
- [ ] APIレスポンスが正常

## ⏱️ タイムライン例

| 時刻 | 作業内容 | 所要時間 |
|------|----------|----------|
| 00:00 | メンテナンス開始 | - |
| 00:05 | DBバックアップ完了 | 5分 |
| 00:10 | DBリセット・スキーマ更新 | 5分 |
| 00:20 | データ移行スクリプト実行 | 10分 |
| 00:25 | pnpm run deploy 実行 | 5分 |
| 00:30 | 動作確認 | 5分 |
| 00:35 | メンテナンス終了 | - |

## 🚨 トラブルシューティング

### 移行スクリプトがエラーになる

```bash
# TypeScriptの型エラーの場合
cd packages/scripts/src/migration-completed
node -r esbuild-register offline-migration.ts
```

### データベース接続エラー

```bash
# 接続URLを確認
echo $DATABASE_URL
echo $BACKUP_DATABASE_URL

# Prismaで接続テスト
cd packages/db
pnpm with-env prisma db pull --print
```

### デプロイが失敗する

```bash
# デプロイログを確認
# pnpm run deploy の出力を詳細に確認

# 環境変数の確認
cat .env

# 個別にデプロイを試す（トラブルシューティング用）
pnpm run deploy:manager  # Managerのみデプロイ
pnpm run deploy:proxy    # ProxyServerのみデプロイ
```

## 📝 移行後の作業

1. **監視強化**: 最初の24時間は監視を強化
2. **バックアップDB削除**: 移行成功確認後、バックアップDBを削除
3. **ドキュメント更新**: 移行完了を記録
4. **関係者への報告**: 移行完了と結果を報告

## 📞 サポート

問題が発生した場合の連絡先：

- **技術サポート**: [連絡先]
- **エスカレーション**: [管理者連絡先]

---

**最終更新**: 2025年8月10日  
**対象バージョン**: feature/add-oauth-draft