# Tumiki ドキュメント構成

Tumiki プロジェクトの技術ドキュメントとガイドラインの集約。

## 📁 ディレクトリ構成

### 🏗️ [architecture/](./architecture/CLAUDE.md)
システム設計・アーキテクチャ関連のドキュメント
- データベース設計
- MCP サーバー管理設計
- マイグレーション計画
- 外部サービス接続設計

### 🔐 [auth/](./auth/CLAUDE.md)
認証・認可関連のドキュメント
- Auth0 設定・統合
- OAuth 実装ガイド
- MCP 準拠認証設計

### 💼 [business/](./business/CLAUDE.md)
ビジネス・マーケティング関連のドキュメント
- ブランドブック
- ランディングページ設計
- ビジネスモデル・戦略

### 🚀 [deployment/](./deployment/CLAUDE.md)
デプロイメント・インフラ関連のドキュメント
- GitHub Actions 設定
- コンテナ利用ガイド
- ProxyServer デプロイメント

### 🛠️ [development/](./development/CLAUDE.md)
開発ガイド・環境設定のドキュメント
- MCP サーバー追加方法
- テスト環境構築
- 開発環境設定

### 🔌 [integrations/](./integrations/CLAUDE.md)
外部サービス連携のドキュメント
- Auth0 OAuth 設定（Figma、Notion）
- Stripe 統合
- サードパーティAPI連携

### ⚙️ [operations/](./operations/CLAUDE.md)
運用・保守関連のドキュメント
- メンテナンスモード
- プロキシサーバー運用
- スクリプト管理

### 🛡️ [security/](./security/CLAUDE.md)
セキュリティ関連のドキュメント
- MCP セキュリティガイド
- 脆弱性対応
- ロール管理
- AI 安全性研究

### 📊 [weekly-reports/](./weekly-reports/CLAUDE.md)
週次業務報告書

### 🎯 [demo/](./demo/CLAUDE.md)
デモ・プレゼンテーション資料

### 📝 [migration/](./migration/CLAUDE.md)
マイグレーション関連のドキュメント

## 🔍 クイックアクセス

### セットアップ・導入
- [Python MCP セットアップ](./development/python-mcp-setup.md)
- [コンテナ利用ガイド](./deployment/container-use-guide.md)
- [開発環境構築](./development/CLAUDE.md)

### セキュリティ・認証
- [MCP セキュリティガイド](./security/MCP_SECURITY_GUIDE.md)
- [二層OAuth認証アーキテクチャ](./auth/two-tier-oauth-architecture.md) - **推奨設計**
- [二層OAuth認証実装計画](./auth/two-tier-oauth-implementation-plan.md) - **実装ガイド**
- [APIキー認証](./auth/apikey-auth.md)
- [OAuth 実装](./auth/oauth/CLAUDE.md)
- [MCP OAuth 認証設計](./auth/mcp-oauth-authentication-design.md)

### パフォーマンス・最適化

- [ProxyServer パフォーマンス最適化](./operations/proxyServer-performance-optimization.md)
- [パフォーマンスチューニング要約](./operations/proxy-server-performance-tuning-summary.md)

## 📋 メモ・備考

- [開発メモ](./memo.md)

## 🔄 更新履歴

ドキュメントの最新更新状況は各ディレクトリのCLAUDE.mdを参照してください。
