# 移行スクリプト

このディレクトリには、個人組織モデルへの移行に使用するスクリプトが含まれています。

## スクリプト一覧

### offline-migration.ts

バックアップDBから新しいスキーマの本番DBへデータを移行するオフライン移行スクリプト。

**実行方法:**

```bash
pnpm tsx packages/scripts/src/migration-completed/offline-migration.ts
```

### verify-migration.ts

移行後のデータ整合性を検証するスクリプト。

**実行方法:**

```bash
pnpm tsx packages/scripts/src/migration-completed/verify-migration.ts
```

## データベーススキーマ更新手順

移行後にスキーマ変更が必要な場合は、以下の手順で実行してください。

### 1. データベースリセット（開発環境）

```bash
# 既存のデータベースを完全にリセット
pnpm db:reset
```

### 2. マイグレーション適用

**本番環境:**

```bash
# 本番環境でのマイグレーション実行
pnpm db:deploy
```

**検証環境:**

```bash
# 検証環境でのマイグレーション実行
pnpm db:migrate
```

### 3. スキーマ生成

```bash
# Prisma Clientの再生成
pnpm db:generate
```

### 4. データ検証

```bash
# 移行後のデータ整合性確認
pnpm tsx packages/scripts/src/migration-completed/verify-migration.ts
```

## 関連ドキュメント

- [オフライン移行ガイド](/docs/migration/offline-migration-guide.md)
- [アーキテクチャ設計書](/docs/architecture/personal-user-organization-migration-plan.md)

## 注意事項

これらのスクリプトは移行完了後も参照用に保持されています。
TypeScriptの型チェックから除外するため、`migration-completed`ディレクトリに配置されています。
