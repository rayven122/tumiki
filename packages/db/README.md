# @tumiki/db

Prismaを使用したデータベース管理パッケージです。型安全なデータベースアクセス、スキーマ管理、暗号化機能を提供します。

## 特徴

- 🗄️ **Prisma ORM** - 型安全で直感的なデータベースアクセス
- 🔐 **フィールド暗号化** - 機密データの自動暗号化・復号化
- 📊 **スキーマ分割** - 機能ごとに整理されたスキーマファイル
- 🏢 **マルチテナント対応** - 組織単位でのデータ分離
- 🔄 **マイグレーション管理** - 安全なスキーマ変更
- 🧪 **テストユーティリティ** - モックとファクトリーパターン

## インストール

```bash
pnpm add @tumiki/db
```

## 使用方法

### 基本的な使用

```typescript
import { prisma } from "@tumiki/db";

// ユーザーの取得
const user = await prisma.user.findUnique({
  where: { id: "user_123" },
});

// MCPサーバーの作成
const server = await prisma.mcpServer.create({
  data: {
    name: "GitHub MCP Server",
    transportType: "STREAMABLE_HTTPS",
    url: "https://api.github.com/mcp",
    authType: "OAUTH",
    oauthProvider: "github",
  },
});
```

### トランザクション

```typescript
import { prisma } from "@tumiki/db";

const result = await prisma.$transaction(async (tx) => {
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

機密データは自動的に暗号化されます：

```typescript
// APIキーの保存（自動暗号化）
const apiKey = await prisma.mcpApiKey.create({
  data: {
    name: "Production API Key",
    apiKey: "sk_live_...", // 自動的に暗号化される
    userId: "user_123",
    userMcpServerInstanceId: "instance_123",
  },
});

// 取得時は自動的に復号化
const key = await prisma.mcpApiKey.findUnique({
  where: { id: apiKey.id },
});
console.log(key.apiKey); // 復号化された値
```

## スキーマ構成

### ディレクトリ構造

```text
packages/db/prisma/
├── schema/
│   ├── base.prisma          # 基本設定とジェネレーター
│   ├── auth.prisma          # 認証関連（User）
│   ├── mcpServer.prisma     # MCPサーバー定義
│   ├── userMcpServer.prisma # ユーザー固有の設定
│   ├── organization.prisma  # 組織・権限管理
│   ├── chat.prisma          # チャット機能
│   ├── apiKey.prisma        # APIキー管理
│   └── waitingList.prisma   # ウェイティングリスト
└── migrations/              # マイグレーションファイル
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

#### McpServer（MCPサーバー定義）

```prisma
model McpServer {
  id           String         @id
  name         String
  transportType TransportType
  authType     AuthType
  serverType   ServerType
  // ... その他のフィールド
}
```

#### Organization（組織管理）

```prisma
model Organization {
  id          String   @id
  name        String
  description String?
  members     OrganizationMember[]
  roles       OrganizationRole[]
}
```

## 型定義

### 自動生成される型

```typescript
import type { McpServer, Organization, User } from "@tumiki/db";

// Prismaの型を直接使用
const processUser = (user: User) => {
  console.log(user.email);
};
```

### Zodスキーマ

```typescript
import { mcpServerSchema, userSchema } from "@tumiki/db/zod";

// バリデーション
const validatedUser = userSchema.parse(userData);
```

## マイグレーション

### マイグレーションの実行

```bash
# 開発環境でマイグレーション作成
pnpm db:migrate:dev

# 本番環境でマイグレーション適用
pnpm db:migrate:deploy

# マイグレーションのリセット（開発環境のみ）
pnpm db:migrate:reset
```

### スキーマの生成

```bash
# Prismaクライアントの生成
pnpm db:generate

# スキーマのフォーマット
pnpm db:format
```

## テスト

### テストユーティリティ

```typescript
import { createMockPrismaClient } from "@tumiki/db/testing";
import { userFactory } from "@tumiki/db/testing/factories";

// モッククライアントの作成
const mockPrisma = createMockPrismaClient();

// ファクトリーを使用したテストデータ作成
const testUser = userFactory.build({
  email: "test@example.com",
});
```

### テストの実行

```bash
# 単体テスト
pnpm test

# カバレッジ付きテスト
pnpm test:coverage
```

## セキュリティ

### フィールド暗号化

以下のフィールドは自動的に暗号化されます：

- `McpApiKey.apiKey` - APIキー
- `UserMcpServerConfig.envVars` - 環境変数
- `OAuthConnection.accessToken` - アクセストークン
- `OAuthConnection.refreshToken` - リフレッシュトークン

### アクセス制御

- ロールベースアクセス制御（RBAC）
- 組織レベルでのデータ分離
- リソースレベルの権限管理

## パフォーマンス最適化

### インデックス

重要なクエリパフォーマンスのため、以下のインデックスが設定されています：

- `User.email` - ユニークインデックス
- `McpApiKey.apiKeyHash` - 検索用ハッシュインデックス
- `UserMcpServerInstance.deletedAt` - 論理削除用インデックス

### 接続プーリング

```typescript
// prisma.tsでの接続プーリング設定
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["error", "warn"],
});
```

## 開発コマンド

```bash
# データベースのセットアップ
pnpm db:setup

# Prismaスタジオ（GUIツール）
pnpm db:studio

# 型チェック
pnpm typecheck

# ビルド
pnpm build

# クリーンアップ
pnpm clean
```

## 環境変数

```env
# データベース接続
DATABASE_URL="postgresql://user:password@localhost:5432/tumiki"

# 暗号化キー（32バイト）
FIELD_ENCRYPTION_KEY="your-32-byte-encryption-key"
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
