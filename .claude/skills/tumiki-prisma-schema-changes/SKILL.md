---
name: tumiki-prisma-schema-changes
description: |
  Prismaスキーマ変更の安全な手順ガイド。データベーススキーマの追加・変更・
  マイグレーション実行時に使用。「テーブル追加」「カラム追加」「マイグレーション」
  などのリクエスト時にトリガー。
sourcePatterns:
  - packages/db/prisma/schema/*.prisma
---

# Prismaスキーマ変更ガイド

## スキーマファイル構成

Tumikiプロジェクトでは、Prismaスキーマを機能ごとに分割：

```
packages/db/prisma/schema/
├── base.prisma           # コア設定とジェネレーター
├── mcpServer.prisma      # MCPサーバー定義
├── userMcpServer.prisma  # ユーザー固有のサーバー設定
├── organization.prisma   # マルチテナント組織
├── chat.prisma           # チャット/メッセージング
├── apiKey.prisma         # APIキー管理
└── waitingList.prisma    # ウェイティングリスト
```

## スキーマ変更手順

### 1. スキーマファイルの編集

適切なファイルを選択して編集：

```prisma
// userMcpServer.prisma の例
model NewTable {
  id             String   @id @default(uuid())
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

## 本番環境へのデプロイ

```bash
# マイグレーション実行（本番）
npx prisma migrate deploy
```

## よくあるパターン

### 新しいカラム追加（オプショナル）

```prisma
model ExistingTable {
  // 既存フィールド...
  newField String? @map("new_field")  // オプショナルで追加
}
```

### 新しいEnum追加

```prisma
enum NewStatus {
  PENDING
  ACTIVE
  INACTIVE
}
```

### リレーション追加

```prisma
// 1対多リレーション
model Parent {
  id       String  @id
  children Child[]
}

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
npx prisma migrate reset
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

## チェックリスト

### スキーマ変更時

- [ ] 適切なスキーマファイルを選択
- [ ] 命名規則に従う（snake_case でマップ）
- [ ] `pnpm db:generate` で型生成
- [ ] `pnpm build` でビルド
- [ ] `pnpm typecheck` で型チェック
- [ ] マイグレーションファイル確認
- [ ] テスト環境にも反映（`pnpm db:push:test`）

### 本番デプロイ時

- [ ] マイグレーションファイルがコミットされている
- [ ] ローカルでマイグレーション成功を確認
- [ ] 破壊的変更がないか確認（カラム削除、型変更など）
- [ ] 必要に応じてデータマイグレーションスクリプト作成

## 注意事項

### 破壊的変更を避ける

- カラム削除は段階的に行う（まず`@map`で別名に、次にアプリから参照を削除、最後にカラム削除）
- 型変更は新カラム追加 → データ移行 → 旧カラム削除の順序で
- NOT NULL制約の追加はデフォルト値とセットで

### テスト環境の同期

開発環境とテスト環境のスキーマを同期させることが重要：

```bash
# 開発環境
pnpm db:push

# テスト環境
pnpm db:push:test
```
