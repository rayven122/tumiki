# Auth0 Post-Login Action セットアップガイド

このガイドでは、Auth0のPost-Login Actionを使用してユーザーのログイン時に自動的にTumikiアプリケーションのデータベースにユーザー情報を同期する機能のセットアップ方法を説明します。

## 概要

- **目的**: Auth0ログイン後、自動的にユーザー情報をTumikiのデータベースに同期
- **利点**: リアルタイム同期、サーバーサイド処理、一元管理
- **フォールバック**: Post-Login Actionが失敗した場合の代替処理も実装済み

## アーキテクチャ

```
ユーザーログイン → Auth0認証 → Post-Login Action実行 → Tumiki API呼び出し → DB同期
                                     ↓ (失敗時)
                   ダッシュボードアクセス → フォールバック同期処理 → DB同期
```

## 実装済みファイル

### 1. APIエンドポイント

- **ファイル**: `/apps/manager/src/app/api/auth/sync-user/route.ts`
- **機能**: Auth0からのWebhook受信、ユーザー情報のDB同期
- **認証**: Bearer token による Auth0からの呼び出し検証

### 2. Auth0 Post-Login Action スクリプト

- **ファイル**: `/docs/auth0-post-login-action.js`
- **機能**: Auth0管理画面で設定するJavaScriptコード

### 3. ログ機能

- **ファイル**: `/apps/manager/src/lib/logger/auth-sync.ts`
- **機能**: 同期処理の詳細ログ、メトリクス、エラー追跡

### 4. フォールバック処理

- **ファイル**: `/apps/manager/src/lib/actions/userSync.ts`
- **機能**: Post-Login Actionが失敗した場合の代替同期処理

## セットアップ手順

### Step 1: 環境変数の設定

`.env`ファイルに以下を追加（既に追加済み）:

```bash
# Auth0 Post-Login Action Webhook Secret
AUTH0_WEBHOOK_SECRET='webhook_secret_for_post_login_action_12345'
```

### Step 2: Auth0 Post-Login Action の作成

1. **Auth0 Dashboard にアクセス**

   - https://manage.auth0.com/dashboard にログイン

2. **Actions > Library に移動**

3. **新しいActionを作成**

   - "Build Custom" をクリック
   - Name: `Tumiki User Sync`
   - Trigger: `Login / Post Login`
   - Runtime: `Node.js 18`

4. **コードをコピー**

   - `/docs/auth0-post-login-action.js` の内容を Action エディターにコピー

5. **Secrets の設定**
   Action の設定画面で以下のSecretsを追加:

   ```
   API_SECRET: webhook_secret_for_post_login_action_12345
   API_ENDPOINT: https://tumiki.claude/api/auth/sync-user
   ```

   **本番環境の場合**:

   ```
   API_ENDPOINT: https://www.tumiki.cloud/api/auth/sync-user
   ```

   **開発環境の場合**:

   ```
   API_ENDPOINT: http://localhost:3000/api/auth/sync-user
   ```

6. **Deploy** ボタンをクリック

### Step 3: Flowに Action を追加

1. **Actions > Flows > Login** に移動

2. **カスタムActionを追加**

   - 作成した `Tumiki User Sync` アクションをドラッグ&ドロップ
   - `Login` → `Tumiki User Sync` → `Complete` の順序で配置

3. **Apply** をクリックして保存

### Step 4: テスト

1. **アプリケーションにログイン**

   - Auth0経由でログインを実行

2. **ログの確認**

   ```bash
   # アプリケーションのログ確認
   pnpm dev

   # Auth0のログ確認
   Auth0 Dashboard > Monitoring > Logs
   ```

3. **データベース確認**
   ```bash
   # Prisma Studio で確認
   cd packages/db
   pnpm db:studio
   ```

## トラブルシューティング

### よくある問題

#### 1. Auth0 Action でタイムアウトエラー

**症状**: Action実行時に timeout エラー
**解決策**:

- API_ENDPOINT の URL が正しいか確認
- ネットワーク接続を確認
- Actionのタイムアウト設定を延長

#### 2. 認証エラー (401 Unauthorized)

**症状**: API から 401 レスポンス
**解決策**:

- `AUTH0_WEBHOOK_SECRET` が正しく設定されているか確認
- Action の `API_SECRET` と環境変数が一致しているか確認

#### 3. CORS エラー

**症状**: ブラウザーコンソールでCORSエラー
**解決策**:

- APIエンドポイントのCORS設定を確認
- 本番環境では適切なドメイン制限を設定

#### 4. ユーザー情報が同期されない

**症状**: ログイン後もDBにユーザー情報が作成されない
**解決策**:

- フォールバック処理が動作するか確認
- ダッシュボードアクセス時のログを確認
- データベース接続状況を確認

### ログとメトリクス

#### 同期統計の確認

```typescript
import { getSyncStats } from "@/lib/logger/auth-sync";

const stats = getSyncStats();
console.log("Sync Statistics:", stats);
// {
//   total: 100,
//   success: 95,
//   error: 5,
//   postLoginActionRate: 90,
//   fallbackRate: 10,
//   averageDuration: 250
// }
```

#### 最新のエラー確認

```typescript
import { getRecentSyncErrors } from "@/lib/logger/auth-sync";

const errors = getRecentSyncErrors(5);
console.log("Recent Errors:", errors);
```

## 本番環境の考慮事項

### セキュリティ

1. **環境変数の管理**: 本番環境では安全な方法でシークレットを管理
2. **CORS設定**: 適切なドメイン制限を設定
3. **Rate Limiting**: 必要に応じてAPI rate limiting を追加

### モニタリング

1. **アラート設定**: 同期失敗率が高い場合のアラート
2. **メトリクス収集**: 同期処理のパフォーマンス監視
3. **ログ管理**: ログの長期保存とローテーション

### パフォーマンス

1. **データベース最適化**: ユーザーテーブルのインデックス最適化
2. **並行処理**: 大量ログイン時の処理能力
3. **キャッシュ**: 必要に応じて同期状態のキャッシュ

## まとめ

この実装により、Auth0ログイン時に自動的にユーザー情報がTumikiのデータベースに同期されるようになります。フォールバック機能により、Post-Login Actionが失敗した場合でも確実にユーザー情報が同期されます。

詳細なログとメトリクスにより、システムの健全性を監視し、問題の早期発見と解決が可能です。
