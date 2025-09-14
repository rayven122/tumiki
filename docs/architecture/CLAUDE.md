# アーキテクチャドキュメント

Tumiki システムアーキテクチャ・設計関連のドキュメント。

## 📋 ドキュメント一覧

### MCPサーバー関連
- [MCPサーバー管理サービスの要件定義書](./MCPサーバー管理サービスの要件定義書.md) - MCP サーバー管理機能の要件定義
- [MCPサーバー管理画面設計書](./MCPサーバー管理画面設計書.md) - 管理画面の UI/UX 設計
- [MCP Server Request Log Design](./mcp-server-request-log-design.md) - リクエストログシステムの設計

### データベース設計
- [DB設計](./DB設計.md) - Prisma を使用したデータベーススキーマ設計

### マイグレーション計画
- [Personal User to Organization Migration Plan](./personal-user-organization-migration-plan.md) - 個人ユーザーから組織への移行計画

### 外部サービス連携
- [外部サービス接続管理設計書](./外部サービス接続管理設計書.md) - 外部 API・サービス連携の設計

## 🏗️ アーキテクチャ概要

### システム構成
- **フロントエンド**: Next.js (App Router)
- **バックエンド**: tRPC + Prisma
- **データベース**: PostgreSQL
- **認証**: Auth0
- **MCP プロキシ**: Node.js + Express

### 主要コンポーネント
1. **Manager アプリ** - ユーザー向け管理画面
2. **ProxyServer** - MCP サーバーとの通信プロキシ
3. **Auth サービス** - 認証・認可管理
4. **DB パッケージ** - データベースアクセス層

## 🔄 更新履歴
最新の設計変更や追加については、各ドキュメントを参照してください。