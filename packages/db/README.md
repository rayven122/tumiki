# @tumiki/db

Prismaを使用したデータベース管理パッケージ。型安全なデータベースアクセス、スキーマ管理、暗号化機能を提供します。

## 特徴

- 🗄️ Prisma ORM - 型安全なデータベースアクセス
- 🔐 フィールド暗号化 - 機密データの自動暗号化・復号化
- 🏢 マルチテナント対応 - 組織単位での自動RLS（Row-Level Security）
- 🔄 マイグレーション管理 - 安全なスキーマ変更

## インストール

```bash
pnpm add @tumiki/db
```

## 使用方法

### インポート

```typescript
// サーバーサイド用（暗号化、RLS機能含む）

// クライアントサイド用（型定義のみ）
import type { User } from "@tumiki/db/client";
import { db } from "@tumiki/db/server";
```

### マルチテナント対応（RLS）

テナントコンテキストを設定すると、自動的に`organizationId`フィルタが適用されます。

## スキーマ構成

```text
prisma/schema/
├── base.prisma          # 基本設定とジェネレーター
├── auth.prisma          # 認証関連（User）
├── mcpServer.prisma     # MCPサーバーテンプレート定義
├── userMcpServer.prisma # ユーザー固有のMCP設定・インスタンス
├── organization.prisma  # 組織・権限管理
├── chat.prisma          # チャット機能
└── waitingList.prisma   # ウェイティングリスト
```

## コマンド

### マイグレーション

```bash
pnpm db:migrate   # 開発環境でマイグレーション作成
pnpm db:deploy    # 本番環境でマイグレーション適用
pnpm db:reset     # マイグレーションのリセット（開発環境のみ）
```

### スキーマ生成

```bash
pnpm db:generate  # Prismaクライアントの生成（Zod、Fabbrica含む）
pnpm build        # ビルド（generate含む）
```

### その他

```bash
pnpm db:studio    # Prisma Studio（GUIツール）
pnpm test         # テスト実行
```

## テスト環境セットアップ

```bash
# 1. テスト用DBコンテナを起動
docker compose -f ./docker/compose.yaml up -d db-test

# 2. テスト用DBにスキーマを適用
pnpm db:push:test

# 3. テストを実行
pnpm test
```

## 環境変数

```env
# データベース接続
DATABASE_URL="postgresql://root:password@localhost:5434/tumiki"

# 暗号化キー（32バイト必須）
FIELD_ENCRYPTION_KEY="your-32-byte-encryption-key-here!!"
```

## セキュリティ

### フィールド暗号化

`/// @encrypted`アノテーションを付けたフィールドは自動的に暗号化されます。

- `McpConfig.envVars` - 環境変数（JSON文字列）

### Row-Level Security（RLS）

マルチテナント対象モデルには自動的にRLSが適用され、テナントスコープでデータを分離します。

## 注意事項

- マイグレーションは必ず開発環境でテスト後に本番環境へ適用
- 暗号化キーは絶対に変更しない（データが復号できなくなります）
