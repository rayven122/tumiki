# Tumiki ドキュメント構成

Tumiki プロジェクトの技術ドキュメント。直近1ヶ月以内に更新された必要最小限のドキュメントのみを保持。

## 📁 ディレクトリ構成

### 🏗️ architecture/
- [MCP Proxy マルチトランスポート検証](./architecture/mcp-proxy-multi-transport-verification.md) (2025-11-18)

### 🔐 auth/
- [Keycloak実装計画](./auth/keycloak/implementation-plan.md) (2025-11-05)
- [JWT認証改善計画](./auth/keycloak/jwt-authentication-improvement-plan.md) (2025-11-07)
- [JWTクレーム設計](./auth/keycloak/jwt-claims-design.md) (2025-11-05)
- [権限管理](./auth/permission-management.md) (2025-11-05)

### 📚 guides/
- [MCPサーバー追加方法](./guides/mcp-server-setup.md) (2025-10-31)
- [テスト環境構築](./guides/testing-environment.md) (2025-11-18)

### 🔌 integrations/
- [Cloud Run MCP連携ガイド](./integrations/cloudrun/integration-guide.md) (2025-10-31)
- [Cloud Run MCP検証ガイド](./integrations/cloudrun/verification-guide.md) (2025-10-31)

## 🔍 クイックアクセス

### 認証・セキュリティ
現在のプロジェクトはNextAuth.js + Keycloakで認証を実装しています。

- Keycloak実装の詳細は [auth/keycloak/](./auth/keycloak/) を参照
- 権限管理の設計は [auth/permission-management.md](./auth/permission-management.md) を参照

### MCP連携
- MCPサーバーの追加方法: [guides/mcp-server-setup.md](./guides/mcp-server-setup.md)
- Cloud Runへのデプロイ: [integrations/cloudrun/](./integrations/cloudrun/)
- マルチトランスポート対応: [architecture/mcp-proxy-multi-transport-verification.md](./architecture/mcp-proxy-multi-transport-verification.md)

### 開発環境
- テスト環境のセットアップ: [guides/testing-environment.md](./guides/testing-environment.md)
