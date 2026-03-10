---
name: tumiki-prisma-schema-changes
description: |
  Prismaスキーマ変更の安全な手順ガイド。データベーススキーマの追加・変更・
  マイグレーション実行時に使用。「テーブル追加」「カラム追加」「マイグレーション」
  などのリクエスト時にトリガー。
sourcePatterns:
  - packages/db/prisma/schema/*.prisma
  - packages/db/prisma/schema/migrations/**
  - packages/db/package.json
---

# Prismaスキーマ変更ガイド

## スキーマファイル構成

Tumikiプロジェクトでは、Prismaスキーマを機能ごとに分割：

```
packages/db/prisma/schema/
├── base.prisma           # コア設定とジェネレーター
├── auth.prisma           # 認証関連（User）
├── mcpServer.prisma      # MCPサーバー定義
├── userMcpServer.prisma  # ユーザー固有のサーバー設定
├── organization.prisma   # マルチテナント組織
├── chat.prisma           # チャット/メッセージング
├── agent.prisma          # AIエージェント
├── notification.prisma   # 通知
├── feedback.prisma       # フィードバック
├── requestLog.prisma     # リクエストログ
└── migrations/           # マイグレーションファイル
```

## ジェネレーター構成

`base.prisma` で定義されているジェネレーター：

```prisma
// Prismaクライアント
generator client {
  provider = "prisma-client-js"
}

// Zod型生成
generator zod {
  provider = "zod-prisma-types"
  output   = "../generated/zod"
}

// ドキュメント生成（prisma-markdown）
generator markdown {
  provider = "prisma-markdown"
  output   = "../README.md"
  title    = "DB Schema"
}

// テストファクトリ
generator fabbrica {
  provider = "prisma-fabbrica"
  output   = "../generated/fabbrica"
}
```

## コマンドリファレンス

### スキーマ生成・ビルド

```bash
cd packages/db

# Prismaクライアント生成（Zod、Fabbrica、ドキュメント含む）
pnpm db:generate

# パッケージビルド（generate含む）
pnpm build
```

### マイグレーション操作

```bash
cd packages/db

# 開発環境でマイグレーション作成（対話式で名前入力）
pnpm db:migrate

# マイグレーション名を指定して作成
npx prisma migrate dev --name add_new_feature

# 本番環境でマイグレーション適用
pnpm db:deploy

# マイグレーションリセット（開発のみ、データ全削除）
pnpm db:reset
```

### スキーマ直接反映

```bash
cd packages/db

# 開発用DBにスキーマ直接反映（マイグレーション不要）
pnpm db:push

# テスト用DBにスキーマ直接反映
pnpm db:push:test
```

### デバッグ・管理

```bash
cd packages/db

# Prisma Studio（GUIでデータ確認・編集）
pnpm db:studio
```

## マイグレーションフロー

### 開発フロー

```
1. スキーマファイル編集
      ↓
2. pnpm db:generate（確認用）
      ↓
3. pnpm db:migrate（マイグレーション作成）
      ↓
4. pnpm build（パッケージビルド）
      ↓
5. pnpm typecheck（型チェック）
```

### 本番デプロイフロー

```
1. マイグレーションファイルをコミット・プッシュ
      ↓
2. CI/CDでpnpm db:deploy実行
      ↓
3. デプロイ完了
```

### マイグレーションファイルの配置

マイグレーションファイルは `packages/db/prisma/schema/migrations/` に配置：

```
packages/db/prisma/schema/migrations/
├── 20251201153100_initial_schema/
│   └── migration.sql
├── 20260106232810_add_chat_mcp_server_relation/
│   └── migration.sql
└── migration_lock.toml
```

**重要**: `packages/db/prisma/migrations/` ではなく `packages/db/prisma/schema/migrations/` が正しい配置場所です。

## Prisma Field Encryption（フィールド暗号化）

### 概要

`prisma-field-encryption` ライブラリを使用して、機密データをデータベースレベルで自動暗号化・復号化します。

### 環境変数

```env
# 32バイトの暗号化キー（必須）
FIELD_ENCRYPTION_KEY="your-32-byte-encryption-key-here!!"
```

**警告**: 暗号化キーを変更すると既存データが復号できなくなります。

### アノテーション

#### `@encrypted` - フィールド暗号化

フィールドの値を自動的に暗号化して保存し、読み取り時に復号化します。

```prisma
model McpConfig {
  id      String @id @default(cuid())
  /// MCPサーバーの環境変数（暗号化して保存）
  envVars String /// @encrypted
}

model McpApiKey {
  id     String @id @default(cuid())
  /// 暗号化されたAPIキー
  apiKey String @unique /// @encrypted
}

model McpOAuthClient {
  id           String @id @default(cuid())
  /// クライアントID（暗号化）
  clientId     String /// @encrypted
  /// クライアントシークレット（暗号化）
  clientSecret String? /// @encrypted
}

model McpOAuthToken {
  id           String @id @default(cuid())
  /// アクセストークン（暗号化）
  accessToken  String /// @encrypted
  /// リフレッシュトークン（暗号化）
  refreshToken String? /// @encrypted
}
```

#### `@encryption:hash()` - ハッシュ生成

指定したフィールドのSHA-256ハッシュを自動生成します。検索用インデックスとして使用。

```prisma
model McpApiKey {
  id         String  @id @default(cuid())
  /// 暗号化されたAPIキー
  apiKey     String  @unique /// @encrypted
  /// APIキーのハッシュ（検索用、自動生成）
  apiKeyHash String? @unique /// @encryption:hash(apiKey)

  @@index([apiKeyHash])
}
```

### 使用パターン

#### 暗号化フィールドの検索

暗号化フィールドは直接検索できないため、ハッシュフィールドを使用：

```typescript
// ❌ 悪い例 - 暗号化フィールドで検索（動作しない）
const apiKey = await prisma.mcpApiKey.findUnique({
  where: { apiKey: rawApiKey },
});

// ✅ 良い例 - ハッシュフィールドで検索
import { hashApiKey } from "@tumiki/db";

const apiKeyHash = hashApiKey(rawApiKey);
const apiKey = await prisma.mcpApiKey.findUnique({
  where: { apiKeyHash },
});
```

#### 暗号化が適用されるフィールド一覧

| モデル         | フィールド              | 説明                          |
| -------------- | ----------------------- | ----------------------------- |
| McpConfig      | envVars                 | 環境変数（JSON文字列）        |
| McpApiKey      | apiKey                  | APIキー                       |
| McpOAuthClient | clientId                | OAuthクライアントID           |
| McpOAuthClient | clientSecret            | OAuthクライアントシークレット |
| McpOAuthClient | registrationAccessToken | DCR登録トークン               |
| McpOAuthToken  | accessToken             | アクセストークン              |
| McpOAuthToken  | refreshToken            | リフレッシュトークン          |
| Organization   | slackBotToken           | Slack Botトークン             |

## prisma-markdown（ドキュメント生成）

### 概要

`prisma-markdown` を使用して、Prismaスキーマから自動的にドキュメントとER図を生成します。

### @namespace アノテーション

モデルやEnumを論理的なドメインにグループ化します。生成されるドキュメントでは、namespace ごとにセクション分けされます。

```prisma
/**
 * @namespace Auth
 */

/// @namespace Auth
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?
}

/// @namespace Auth
enum Role {
  USER
  ADMIN
}
```

### 複数namespace

1つのモデルを複数のnamespaceに所属させることも可能：

```prisma
/// @namespace Auth
/// @namespace Chat
model User {
  // Userは「Auth」と「Chat」両方のセクションに表示される
}

/// @namespace McpServer
/// @namespace UserMcpServer
model McpServerTemplate {
  // テンプレートは両方のドメインに関連
}
```

### 現在のnamespace一覧

| Namespace     | 説明                    | 主なモデル                                         |
| ------------- | ----------------------- | -------------------------------------------------- |
| Auth          | 認証・ユーザー管理      | User, Account, Session                             |
| Organization  | 組織・権限管理          | Organization, OrganizationMember, OrganizationRole |
| McpServer     | MCPサーバーテンプレート | McpServerTemplate, McpTool                         |
| UserMcpServer | ユーザー固有のMCP設定   | McpServer, McpConfig, McpApiKey, McpOAuthClient    |
| Chat          | チャット機能            | Chat, Message                                      |
| Agent         | AIエージェント          | Agent, AgentSchedule, AgentExecutionLog            |
| Notification  | 通知システム            | Notification, NotificationPriority                 |
| Feedback      | フィードバック          | Feedback, FeedbackType, FeedbackStatus             |
| RequestLog    | リクエストログ          | McpServerRequestLog                                |

### ドキュメント生成

```bash
cd packages/db
pnpm db:generate  # README.mdが自動生成される
```

生成されるファイル: `packages/db/prisma/README.md`

## スキーマ変更手順

### 1. スキーマファイルの編集

適切なファイルを選択して編集：

```prisma
// userMcpServer.prisma の例
/// @namespace UserMcpServer
model NewTable {
  id             String   @id @default(cuid())
  /// 機密データ（暗号化）
  secretData     String   /// @encrypted
  organizationId String   @map("organization_id")
  createdAt      DateTime @default(now()) @map("created_at")

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("new_table")
}
```

### 2. Prismaクライアント生成（確認用）

```bash
cd packages/db
pnpm db:generate
```

### 3. 開発環境への反映

#### 方法A: db:push（開発用、マイグレーション不要）

```bash
cd packages/db
pnpm db:push
```

#### 方法B: マイグレーション作成（本番用）

```bash
cd packages/db
pnpm db:migrate
# または名前を指定
npx prisma migrate dev --name add_new_table
```

### 4. パッケージのビルド

```bash
cd packages/db
pnpm build
```

### 5. 型の確認

```bash
pnpm typecheck
```

## よくあるパターン

### 新しいカラム追加（オプショナル）

```prisma
model ExistingTable {
  // 既存フィールド...
  newField String? @map("new_field")  // オプショナルで追加
}
```

### 暗号化フィールドの追加

```prisma
model ExistingTable {
  // 既存フィールド...
  /// APIトークン（暗号化して保存）
  apiToken String? /// @encrypted
}
```

### ハッシュインデックス付き暗号化フィールド

```prisma
model ExistingTable {
  // 既存フィールド...
  /// シークレット（暗号化）
  secret     String  @unique /// @encrypted
  /// シークレットのハッシュ（検索用）
  secretHash String? @unique /// @encryption:hash(secret)

  @@index([secretHash])
}
```

### 新しいEnum追加

```prisma
/// @namespace YourNamespace
enum NewStatus {
  PENDING
  ACTIVE
  INACTIVE
}
```

### リレーション追加

```prisma
// 1対多リレーション
/// @namespace Parent
model Parent {
  id       String  @id
  children Child[]
}

/// @namespace Parent
model Child {
  id       String @id
  parentId String @map("parent_id")
  parent   Parent @relation(fields: [parentId], references: [id])
}
```

### インデックス追加

```prisma
model TableWithIndex {
  id        String   @id
  userId    String   @map("user_id")
  createdAt DateTime @map("created_at")

  @@index([userId])
  @@index([createdAt])
  @@map("table_with_index")
}
```

### 複合ユニーク制約

```prisma
model UniqueComposite {
  id             String @id
  organizationId String @map("organization_id")
  name           String

  @@unique([organizationId, name])
  @@map("unique_composite")
}
```

## 命名規則

### フィールド命名

- **Prismaモデル**: camelCase（例: `organizationId`, `createdAt`）
- **DBカラム**: snake_case（`@map`で指定、例: `@map("organization_id")`）

### モデル/テーブル命名

- **Prismaモデル**: PascalCase（例: `McpServer`, `UserMcpServerConfig`）
- **DBテーブル**: snake_case（`@@map`で指定、例: `@@map("mcp_server")`）

## トラブルシューティング

### マイグレーション競合

```bash
# マイグレーション履歴をリセット（開発のみ）
cd packages/db
pnpm db:reset
```

### 型が更新されない

```bash
cd packages/db
pnpm db:generate
pnpm build
```

### テスト環境のスキーマ反映

```bash
cd packages/db
pnpm db:push:test
```

### Prisma Studioで確認

```bash
cd packages/db
pnpm db:studio
```

### 暗号化フィールドがnullになる

暗号化キーが設定されているか確認：

```bash
echo $FIELD_ENCRYPTION_KEY
```

### マイグレーションファイルが間違った場所に生成された

正しい配置場所は `packages/db/prisma/schema/migrations/` です。
誤って `packages/db/prisma/migrations/` に生成された場合は移動してください。

## チェックリスト

### スキーマ変更時

- [ ] 適切なスキーマファイルを選択
- [ ] `@namespace` アノテーションを追加
- [ ] 命名規則に従う（snake_case でマップ）
- [ ] 機密データには `@encrypted` を追加
- [ ] 検索が必要な暗号化フィールドには `@encryption:hash()` を追加
- [ ] `pnpm db:generate` で型生成
- [ ] `pnpm build` でビルド
- [ ] `pnpm typecheck` で型チェック
- [ ] マイグレーションファイル確認
- [ ] テスト環境にも反映（`pnpm db:push:test`）

### 本番デプロイ時

- [ ] マイグレーションファイルがコミットされている
- [ ] マイグレーションファイルが正しい場所にある（`prisma/schema/migrations/`）
- [ ] ローカルでマイグレーション成功を確認
- [ ] 破壊的変更がないか確認（カラム削除、型変更など）
- [ ] 暗号化キーが本番環境で設定されている
- [ ] 必要に応じてデータマイグレーションスクリプト作成

## 注意事項

### 破壊的変更を避ける

- カラム削除は段階的に行う（まず`@map`で別名に、次にアプリから参照を削除、最後にカラム削除）
- 型変更は新カラム追加 → データ移行 → 旧カラム削除の順序で
- NOT NULL制約の追加はデフォルト値とセットで

### 暗号化に関する注意

- 暗号化キー（`FIELD_ENCRYPTION_KEY`）は絶対に変更しない
- 暗号化フィールドは直接検索できない（ハッシュを使用）
- 暗号化はアプリケーションレベルで行われる（DBには暗号化済みデータが保存される）

### テスト環境の同期

開発環境とテスト環境のスキーマを同期させることが重要：

```bash
# 開発環境
pnpm db:push

# テスト環境
pnpm db:push:test
```
