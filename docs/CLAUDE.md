# Tumiki ドキュメント構成

Tumiki プロジェクトの技術ドキュメントとガイドラインの集約。

## 📁 ディレクトリ構成

### 🏗️ architecture/
システム設計・アーキテクチャ関連のドキュメント
- データベース設計
- MCP Proxy 設計・検証
- デスクトップアプリ設計
- リクエストログシステム設計

### 🔐 auth/
認証・認可関連のドキュメント
- 二層OAuth認証実装計画（推奨）
- MCP準拠認証設計
- Auth0/Keycloak設定
- APIキー認証

### 📚 guides/
セットアップ・開発ガイド
- MCPサーバー追加方法
- Python MCP セットアップ
- テスト環境構築
- Stripe 統合
- GitHub Actions CI/CD
- コンテナ利用ガイド

### 🔌 integrations/
外部サービス連携のドキュメント
- Cloud Run MCP 連携

### 📝 migration/
マイグレーション関連のドキュメント
- PostgreSQL → Cloud Storage 移行
- 組織化改修計画
- Prismaマイグレーション管理

### ⚙️ operations/
運用・保守関連のドキュメント
- プロキシサーバー運用・デプロイ
- パフォーマンス最適化
- メンテナンスモード
- メール送信機能

### 🛡️ security/
セキュリティ関連のドキュメント
- MCP セキュリティガイド
- ロール管理

### 📊 weekly-reports/
週次業務報告書

## 🔍 クイックアクセス

### 🚀 セットアップ・導入
- [MCPサーバー追加方法](./guides/mcp-server-setup.md)
- [Python MCP セットアップ](./guides/python-mcp-setup.md)
- [テスト環境構築](./guides/testing-environment.md)
- [コンテナ利用ガイド](./guides/container-use-guide.md)

### 🔐 認証・セキュリティ
- [二層OAuth認証実装計画](./auth/two-tier-oauth-implementation-plan.md) - **推奨設計**
- [MCP準拠認証設計](./auth/mcp-compliant-auth-design.md) - **詳細仕様**
- [MCPセキュリティガイド](./security/MCP_SECURITY_GUIDE.md)
- [APIキー認証](./auth/apikey-auth.md)

### ⚡ 運用・パフォーマンス
- [ProxyServerパフォーマンス最適化](./operations/proxyServer-performance-optimization.md)
- [接続遅延改善](./operations/proxyserver-connection-delay-improvement.md)
- [ProxyServerデプロイ](./operations/proxy-server-deployment.md)

### 🔌 統合・連携
- [Cloud Run MCP連携](./integrations/cloudrun/integration-guide.md)
- [Stripe統合](./guides/stripe-setup.md)
