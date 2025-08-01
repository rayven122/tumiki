# @tumiki/scripts

このパッケージには、Tumikiプロジェクトの開発・テスト・運用に使用する各種スクリプトが含まれています。

## スクリプト一覧

### test-auth0-api.ts

Auth0 Post-Login Action APIのローカル検証用TypeScriptテストスクリプトです。

#### 機能

- **正常ケーステスト**: 新規ユーザー作成、既存ユーザー更新
- **バリデーションテスト**: 無効なデータの処理確認
- **認証テスト**: Bearer token認証の検証
- **CORSテスト**: CORS設定の確認
- **パフォーマンステスト**: レスポンス時間の測定と統計
- **型安全性**: TypeScriptによる完全な型安全性

#### 使用方法

```bash
# ローカル開発サーバーを起動
pnpm dev

# 別のターミナルでテストスクリプトを実行
cd packages/scripts
pnpm test-auth0-api
```

#### 前提条件

1. **ローカル開発サーバーの起動**

   ```bash
   pnpm dev
   ```

2. **環境変数の設定**

   ```bash
   # .env ファイルに以下が設定されていること
   AUTH0_WEBHOOK_SECRET='webhook_secret_for_post_login_action_12345'
   DATABASE_URL='your_database_url'
   ```

3. **データベース接続**
   - PostgreSQLデータベースが起動していること
   - マイグレーションが完了していること

#### テストケース

| ケース               | 説明                         | 期待結果         |
| -------------------- | ---------------------------- | ---------------- |
| 新規ユーザー         | 初回ログイン時のユーザー作成 | 201 Created      |
| 既存ユーザー         | 2回目以降のログイン時の更新  | 200 OK           |
| 最小データ           | subのみのリクエスト          | 200 OK           |
| 認証エラー           | 無効なBearer token           | 401 Unauthorized |
| バリデーションエラー | 無効なemail形式              | 400 Bad Request  |
| CORSテスト           | OPTIONSリクエスト            | 200 OK           |

#### 出力例

```
🚀 Auth0 Post-Login Action API テスト開始
📍 エンドポイント: http://localhost:3000/api/auth/sync-user
🔑 シークレット: 設定済み

🌐 CORSテスト
✅ CORSテスト成功
   CORS Headers: {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'POST, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type, Authorization'
   }

🔐 認証エラーテスト
✅ 認証エラーテスト成功: 401 Unauthorized
   レスポンス: { success: false, error: 'Unauthorized' }

📊 ユーザーデータテスト

1. 正常ケース - 新規ユーザー
   送信データ: {
     "sub": "auth0|test_user_001",
     "name": "Test User 001",
     "email": "test001@example.com",
     "picture": "https://example.com/avatar001.jpg"
   }
✅ 正常ケーステスト成功
   ユーザーID: auth0|test_user_001
   ユーザー名: Test User 001
   メール: test001@example.com
   ロール: USER
```

#### トラブルシューティング

**Connection Refused エラー**

```
❌ 正常ケーステスト失敗
   ステータス: FETCH_ERROR
   エラー詳細: connect ECONNREFUSED 127.0.0.1:3000
```

- 解決方法: `pnpm dev` でローカルサーバーを起動してください

**Database Connection エラー**

```
❌ 正常ケーステスト失敗
   ステータス: 500
   エラー詳細: { success: false, error: 'Internal server error' }
```

- 解決方法: DATABASE_URLを確認し、データベースが起動していることを確認してください

**認証エラー**

```
❌ 正常ケーステスト失敗
   ステータス: 401
   エラー詳細: { success: false, error: 'Unauthorized' }
```

- 解決方法: AUTH0_WEBHOOK_SECREが正しく設定されていることを確認してください

## 開発者向け情報

### 新しいスクリプトの追加

1. `scripts/` ディレクトリに新しいスクリプトファイルを作成
2. 適切なドキュメントをこのREADMEに追加
3. 必要に応じて `package.json` の scripts セクションに追加

### スクリプトの命名規則

- `test-*.ts`: テスト用TypeScriptスクリプト
- `setup-*.ts`: セットアップ用TypeScriptスクリプト
- `deploy-*.ts`: デプロイ用TypeScriptスクリプト
- `migrate-*.ts`: データ移行用TypeScriptスクリプト

### TypeScript実行環境

スクリプトの実行には `tsx` を使用します:

```bash
# @tumiki/scriptsパッケージ内でスクリプトを実行
cd packages/scripts
pnpm your-script-name

# または直接tsxで実行
tsx src/your-script.ts
```
