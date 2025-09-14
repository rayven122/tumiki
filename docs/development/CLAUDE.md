# 開発ガイド・環境設定ドキュメント

Tumiki の開発環境構築、開発ガイドライン、ツール設定に関するドキュメント。

## 📋 ドキュメント一覧

### 開発環境
- [Adding MCP Server](./adding-mcp-server.md) - MCP サーバーの追加方法
- [Testing Environment](./testing-environment.md) - テスト環境の構築
- [Python MCP Setup](./python-mcp-setup.md) - Python MCP サーバーのセットアップ

### 外部サービス統合
- [Stripe Setup](./stripe-setup.md) - Stripe 決済の設定
- [Stripe Integration Implementation Plan](./stripe-integration-implementation-plan.md) - Stripe 統合実装計画

### 環境管理
- [Vercel Env Management](./vercel-env-management.md) - Vercel 環境変数管理

## 🛠️ 開発環境セットアップ

### 必要要件
- Node.js >= 22.14.0
- pnpm >= 10.11.0
- Docker & Docker Compose
- PostgreSQL

### クイックスタート
```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env

# データベース起動
docker compose -f ./docker/compose.dev.yaml up -d

# データベーススキーマ適用
cd packages/db && pnpm db:push

# 開発サーバー起動
pnpm dev
```

## 📝 開発ガイドライン

### コーディング規約
- **TypeScript**: strict モード必須
- **フォーマット**: Prettier 使用
- **リント**: ESLint 設定準拠
- **コンポーネント**: 関数コンポーネント + アロー関数

### テスト方針
- **フレームワーク**: Vitest
- **カバレッジ目標**: 100%
- **テスト記法**: 日本語でテスト名記載

### コミット規約
- Conventional Commits 準拠
- PR 前に `pnpm check` 実行
- Claude Code Review 対応

## 🔧 開発ツール

### 推奨エディタ
- VS Code + 推奨拡張機能
- ESLint/Prettier 自動フォーマット

### デバッグツール
- React Developer Tools
- Prisma Studio
- tRPC DevTools

## 📚 リソース
- [アーキテクチャドキュメント](../architecture/CLAUDE.md)
- [デプロイメントガイド](../deployment/CLAUDE.md)