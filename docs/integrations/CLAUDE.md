# 外部サービス連携ドキュメント

Tumiki と外部サービスとの連携・統合に関するドキュメント。

## 📋 ドキュメント一覧

### OAuth 連携
- [Auth0 Figma OAuth Setup](./auth0-figma-oauth-setup.md) - Figma との OAuth 連携設定
- [Auth0 Notion OAuth Setup](./auth0-notion-oauth-setup.md) - Notion との OAuth 連携設定

## 🔌 連携サービス一覧

### 認証プロバイダー
- **Auth0** - メイン認証基盤
- **OAuth 2.0** - サードパーティ認証

### 生産性ツール
- **Figma** - デザインコラボレーション
- **Notion** - ドキュメント管理

### 決済サービス
- **Stripe** - サブスクリプション管理

### インフラサービス
- **Vercel** - ホスティング
- **Supabase/Neon** - データベース

## 🔄 統合パターン

### OAuth フロー
1. Auth0 経由での認証
2. サードパーティアプリ承認
3. アクセストークン取得
4. API 連携

### Webhook 統合
- イベント駆動型連携
- リアルタイム同期
- 非同期処理

### API 連携
- REST API
- GraphQL
- WebSocket

## 🛡️ セキュリティ考慮事項

### トークン管理
- 暗号化保存
- 定期的なローテーション
- スコープ制限

### データ保護
- エンドツーエンド暗号化
- 最小権限原則
- 監査ログ

## 📝 実装ガイド
各サービスとの連携実装については、個別のドキュメントを参照してください。