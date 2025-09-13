# OAuth ドキュメント

Tumiki の OAuth 実装、統合、API リファレンスに関するドキュメント。

## 📋 ドキュメント一覧

- [OAuth Integration Guide](./oauth-integration-guide.md) - OAuth 統合ガイド
- [OAuth Access Token Documentation](./oauth-access-token-documentation.md) - アクセストークンドキュメント
- [OAuth API Reference](./oauth-api-reference.md) - OAuth API リファレンス
- [Analysis Report](./ANALYSIS_REPORT.md) - OAuth 実装分析レポート

## 🔐 OAuth アーキテクチャ

### OAuth 2.0 フロー
1. **認可リクエスト** - ユーザーを認可サーバーへリダイレクト
2. **ユーザー認証** - ユーザーがログインと権限付与
3. **認可コード** - コールバックで認可コード受信
4. **トークン交換** - 認可コードをアクセストークンと交換
5. **API アクセス** - トークンを使用してAPIアクセス

### サポートグラントタイプ
- Authorization Code (推奨)
- Client Credentials
- Refresh Token

## 🔑 トークン管理

### アクセストークン
- **有効期限**: 1時間
- **スコープ**: 最小権限原則
- **保存**: 暗号化して保存

### リフレッシュトークン
- **有効期限**: 30日
- **ローテーション**: 使用時に新規発行
- **取り消し**: 即座に無効化可能

## 🛡️ セキュリティ

### PKCE (Proof Key for Code Exchange)
- SPAやモバイルアプリで必須
- 認可コード横取り攻撃を防止

### State パラメータ
- CSRF攻撃防止
- ランダムな値を生成・検証

### スコープ制限
- 必要最小限の権限のみ要求
- ユーザーに明確に表示

## 📚 関連リソース
- [Auth0 OAuth 設定](../auth/oauth/CLAUDE.md)
- [セキュリティガイド](../security/CLAUDE.md)
- [API リファレンス](./oauth-api-reference.md)