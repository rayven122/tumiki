# @tumiki/db

Prismaを使用したデータベース管理パッケージです。型安全なデータベースアクセス、スキーマ管理、暗号化機能を提供します。

## 特徴

- 🗄️ **Prisma ORM** - 型安全で直感的なデータベースアクセス
- 🔐 **フィールド暗号化** - 機密データの自動暗号化・復号化
- 📊 **スキーマ分割** - 機能ごとに整理されたスキーマファイル
- 🏢 **マルチテナント対応** - 組織単位での自動RLS（Row-Level Security）
- 🌐 **WebSocket/TCP接続** - Neon Serverlessとの柔軟な接続方式
- 🔄 **マイグレーション管理** - 安全なスキーマ変更
- 🧪 **テストユーティリティ** - モックとファクトリーパターン

## インストール

```bash
pnpm add @tumiki/db
```

## 使用方法

### 基本的な使用

#### サーバーサイド（デフォルトエクスポート）

```typescript
import { db } from "@tumiki/db";

// ローカル環境: TCP接続、本番環境: WebSocket接続が自動選択される

// ユーザーの取得
const user = await db.user.findUnique({
  where: { id: "user_123" },
});
```

#### エクスポートの使い分け

```typescript
// サーバーサイド用（暗号化、RLS機能含む）
import { db } from "@tumiki/db/server";

// クライアントサイド用（型定義のみ）
import type { User } from "@tumiki/db/client";

// Prismaクライアント直接利用（型定義のみ）
import type { PrismaClient } from "@tumiki/db/prisma";

// TCP接続用（ローカル開発）
import { db } from "@tumiki/db/tcp";
```

### マルチテナント対応（RLS）

テナントコンテキストを設定すると、自動的にorganizationIdフィルタが適用されます：

```typescript
import { db } from "@tumiki/db";
import { runWithTenant } from "@tumiki/db/context";

// テナントコンテキストで実行
await runWithTenant({ organizationId: "org_123" }, async () => {
  // 自動的に organizationId = "org_123" でフィルタされる
  const configs = await db.mcpConfig.findMany();

  // 作成時も自動的に organizationId が設定される
  const newConfig = await db.mcpConfig.create({
    data: { name: "New Config" },
  });
});

// RLSをバイパスする必要がある場合
const allUsers = await db.$runWithoutRLS(async (cleanDb) => {
  return cleanDb.user.findMany();
});
```

### トランザクション

```typescript
import { db } from "@tumiki/db";

const result = await db.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: "user@example.com", name: "Test User" },
  });

  const org = await tx.organization.create({
    data: {
      name: "Test Organization",
      createdBy: user.id,
    },
  });

  return { user, org };
});
```

### 暗号化フィールド

機密データは自動的に暗号化されます（`prisma-field-encryption`ミドルウェア使用）：

```typescript
import { db } from "@tumiki/db";

// 環境変数の保存（自動暗号化）
const config = await db.mcpConfig.create({
  data: {
    name: "Production Config",
    envVars: JSON.stringify({ API_KEY: "secret" }), // 自動的に暗号化される
    organizationId: "org_123",
  },
});

// 取得時は自動的に復号化
const savedConfig = await db.mcpConfig.findUnique({
  where: { id: config.id },
});
console.log(savedConfig.envVars); // 復号化された値

// 注意: envVarsはomitされているため、明示的にselectする必要がある場合があります
const configWithEnv = await db.mcpConfig.findUnique({
  where: { id: config.id },
  omit: { envVars: false },
});
```

## スキーマ構成

### ディレクトリ構造

```text
packages/db/
├── prisma/
│   ├── schema/
│   │   ├── base.prisma          # 基本設定とジェネレーター
│   │   ├── auth.prisma          # 認証関連（User）
│   │   ├── mcpServer.prisma     # MCPサーバーテンプレート定義
│   │   ├── userMcpServer.prisma # ユーザー固有のMCP設定・インスタンス
│   │   ├── organization.prisma  # 組織・権限管理
│   │   ├── chat.prisma          # チャット機能
│   │   └── waitingList.prisma   # ウェイティングリスト
│   └── migrations/              # マイグレーションファイル
└── src/
    ├── index.ts                 # デフォルトエクスポート（環境に応じてWS/TCP）
    ├── server.ts                # サーバーサイド用エクスポート
    ├── client.ts                # クライアントサイド用エクスポート（型のみ）
    ├── wsClient.ts              # WebSocket接続用クライアント
    ├── tcpClient.ts             # TCP接続用クライアント
    ├── createBaseClient.ts      # クライアント作成基盤（暗号化、RLS含む）
    ├── context/
    │   └── tenantContext.ts     # マルチテナントコンテキスト管理
    └── extensions/
        └── multiTenancy/        # RLS自動適用拡張
```

### 主要なモデル

#### User（認証）

```prisma
model User {
  id                     String   @id
  name                   String?
  email                  String?  @unique
  image                  String?
  role                   Role     @default(USER)
  hasCompletedOnboarding Boolean  @default(false)
}
```

#### McpServerTemplate（MCPサーバーテンプレート）

```prisma
model McpServerTemplate {
  id                String         @id
  name              String
  transport         String
  authType          String
  serverType        String
  // 公開テンプレート定義
}
```

#### McpConfig（ユーザー固有のMCP設定）

```prisma
model McpConfig {
  id             String  @id
  name           String
  organizationId String
  envVars        String? /// @encrypted  // 自動暗号化
  // テナントごとの設定（RLS対象）
}
```

#### Organization（組織管理）

```prisma
model Organization {
  id          String   @id
  name        String
  slug        String   @unique
  description String?
  members     OrganizationMember[]
  // マルチテナントのルート
}
```

## 型定義

### 自動生成される型

```typescript
// Prismaの型を直接使用（クライアント側）
import type { McpConfig, Organization, User } from "@tumiki/db/client";
// サーバーサイドの拡張型（RLSヘルパー含む）
import type { Db } from "@tumiki/db/server";

const processUser = (user: User) => {
  console.log(user.email);
};

const useDb = (db: Db) => {
  // db.$runWithoutRLS などのヘルパーが利用可能
};
```

### Zodスキーマ

```typescript
import { OrganizationSchema, UserSchema } from "@tumiki/db/zod";

// バリデーション（zod-prisma-typesで自動生成）
const validatedUser = UserSchema.parse(userData);
```

## マイグレーション

### マイグレーションの実行

```bash
# 開発環境でマイグレーション作成
pnpm db:migrate

# 本番環境でマイグレーション適用
pnpm db:deploy

# マイグレーションのリセット（開発環境のみ）
pnpm db:reset

# テスト環境のDBスキーマを更新
pnpm db:push:test
```

### スキーマの生成

```bash
# Prismaクライアントの生成（Zod、Fabbrica含む）
pnpm db:generate

# ビルド（generate含む）
pnpm build
```

## テスト

### テストユーティリティ

```typescript
import { defineUserFactory } from "@tumiki/db/testing";

// Fabbricaを使用したファクトリー定義
const UserFactory = defineUserFactory();

// テストデータ作成
const testUser = await UserFactory.create({
  email: "test@example.com",
  name: "Test User",
});
```

### テストの実行

```bash
# 単体テスト（Vitest）
pnpm test

# テスト環境にはvitest-environment-vprismaを使用
# トランザクション分離された独立したテスト実行が可能
```

### テスト環境のセットアップ

```bash
# 1. テスト用DBコンテナを起動
docker compose -f ./docker/compose.yaml up -d db-test

# 2. テスト用DBにスキーマを適用
pnpm db:push:test

# 3. テストを実行
pnpm test
```

## セキュリティ

### フィールド暗号化

以下のフィールドは自動的に暗号化されます（`/// @encrypted` アノテーション）：

- `McpConfig.envVars` - 環境変数（JSON文字列）

暗号化には `FIELD_ENCRYPTION_KEY` 環境変数が必要です（32バイト）。

### Row-Level Security（RLS）

マルチテナンシー拡張により、テナントスコープ対象モデルには自動的にRLSが適用されます：

```typescript
// 対象モデル（TENANT_SCOPED_MODELS）
const TENANT_SCOPED_MODELS = [
  "McpConfig",
  "McpInstance",
  // ... その他
];

// コンテキストの設定
await runWithTenant({ organizationId: "org_123" }, async () => {
  // 自動的にorganizationIdフィルタが適用される
  const configs = await db.mcpConfig.findMany();
});

// RLSのバイパス（管理者権限操作など）
await db.$runWithoutRLS(async (cleanDb) => {
  return cleanDb.user.findMany();
});
```

### アクセス制御

- ロールベースアクセス制御（RBAC） - `User.role`
- 組織レベルでのデータ分離 - 自動RLSフィルタ
- テナントコンテキスト検証 - `validateOrganizationContext()`

## パフォーマンス最適化

### データベース接続

#### WebSocket接続（本番環境・Neon Serverless）

```typescript
// wsClient.ts - WebSocket接続
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString });
const client = new PrismaClient({ adapter });
```

#### TCP接続（ローカル開発）

```typescript
// tcpClient.ts - 標準TCP接続
const client = new PrismaClient();
```

環境に応じて自動選択：

- `DATABASE_URL` に `localhost` 含む → TCP接続
- それ以外 → WebSocket接続

### インデックス

重要なクエリパフォーマンスのため、以下のインデックスが設定されています：

- `User.email` - ユニークインデックス
- `Organization.slug` - ユニークインデックス
- `McpConfig.organizationId` - テナントフィルタ用インデックス
- `McpInstance.deletedAt` - 論理削除用インデックス

## 開発コマンド

```bash
# Prismaスタジオ（GUIツール）
pnpm db:studio

# 型チェック
pnpm typecheck

# ビルド（Prismaクライアント生成 + TypeScriptコンパイル）
pnpm build

# テスト実行
pnpm test

# クリーンアップ
pnpm clean

# 環境変数付きコマンド実行
pnpm with-env <command>       # .envを使用
pnpm with-env-test <command>  # .env.testを使用
```

## 環境変数

```env
# データベース接続（開発環境）
DATABASE_URL="postgresql://root:password@localhost:5434/tumiki"

# テスト環境用データベース
DATABASE_URL="postgresql://root:password@localhost:5433/tumiki_test"  # .env.test

# 暗号化キー（32バイト必須）
FIELD_ENCRYPTION_KEY="your-32-byte-encryption-key-here!!"

# Node環境
NODE_ENV="development"  # または "production"
```

## トラブルシューティング

### マイグレーションエラー

```bash
# マイグレーション履歴の確認
pnpm db:migrate:status

# 特定のマイグレーションまでロールバック
pnpm db:migrate:resolve
```

### 接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- PostgreSQLが起動しているか確認
- 接続プーリングの設定を確認

### 型エラー

```bash
# Prismaクライアントの再生成
pnpm db:generate

# TypeScriptの再起動
pnpm typecheck
```

## 注意事項

- マイグレーションは必ず開発環境でテストしてから本番環境に適用してください
- 暗号化キーは絶対に変更しないでください（データが復号できなくなります）
- 論理削除（`deletedAt`）を使用している場合は、クエリで明示的にフィルタリングしてください

## 貢献

新しいスキーマを追加する場合：

1. `prisma/schema/`に新しい`.prisma`ファイルを作成
2. `base.prisma`でインポート
3. マイグレーションを作成
4. テストを追加
