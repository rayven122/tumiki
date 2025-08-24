# データを保持したままPrismaマイグレーション履歴を初期化する手順

## 概要

データベースのデータとスキーマ構造を保持したまま、マイグレーション履歴だけを1つの初期マイグレーションに統合（スカッシュ）します。この手順により、21個の個別マイグレーションが1つの統合マイグレーションにまとめられます。

## 前提条件

- 現在のデータベーススキーマが最新の状態（21個のマイグレーションが適用済み）
- データベース内のデータは削除されません
- スキーマ構造の変更はありません

## 実行手順

### 1. 現在の状態の確認とバックアップ

```bash
# 現在のマイグレーション状態を確認
cd packages/db
pnpm with-env prisma migrate status
# 出力: 21 migrations found, Database schema is up to date!

# マイグレーション履歴のバックアップを作成
cp -r prisma/schema/migrations prisma/schema/migrations_backup_$(date +%Y%m%d_%H%M%S)
```

### 2. 統合マイグレーションSQLファイルの生成

```bash
# ディレクトリを作成
mkdir -p ./prisma/schema/migrations/00000000000000_squashed_migrations

# 現在のスキーマから単一のマイグレーションSQLを生成
# これは空のデータベースから現在のスキーマまでの差分を1つのSQLファイルとして出力
pnpm with-env prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema \
  --script > ./prisma/schema/migrations/00000000000000_squashed_migrations/migration.sql
```

### 3. 既存のマイグレーションファイルを削除

```bash
# 既存のマイグレーションを削除（00000000000000_squashed_migrationsは残す）
find prisma/schema/migrations -type d -name "20*" -exec rm -rf {} +
rm -f prisma/schema/migrations/migration_lock.toml
```

### 4. 本番データベースでマイグレーションを適用済みとしてマーク

```bash
# 統合マイグレーションを「すでに適用済み」としてマーク
# これによりデータベースには触れずに、マイグレーション履歴だけを更新
pnpm with-env prisma migrate resolve --applied 00000000000000_squashed_migrations
# 出力: Migration 00000000000000_squashed_migrations marked as applied.
```

### 5. 検証

```bash
# マイグレーション状態を確認
pnpm with-env prisma migrate status
# 出力: 1 migration found, Database schema is up to date!

# Prismaクライアントを再生成
pnpm db:generate

# ビルドと型チェックで問題がないことを確認
pnpm build
pnpm typecheck
```

## 実行結果

- ✅ マイグレーション数: 21個 → 1個に統合
- ✅ データベースのデータ: 完全に保持
- ✅ スキーマ構造: 変更なし
- ✅ ビルドと型チェック: 正常に完了

## 重要な注意事項

### ✅ データは保持されます
- この手順ではデータベースのデータは一切削除されません
- スキーマ構造も変更されません
- マイグレーション履歴の管理方法だけが変更されます

### ⚠️ 本番環境での実行前に
- 必ず開発環境でテストしてください
- データベースのバックアップを取得してください
- チーム全体に通知してください

## ロールバック手順

問題が発生した場合のロールバック：

```bash
# バックアップからマイグレーションを復元
rm -rf prisma/schema/migrations
mv prisma/schema/migrations_backup_* prisma/schema/migrations

# 状態を確認
pnpm with-env prisma migrate status
```

## メリット

- 🚀 **高速化**: 新規環境のセットアップが大幅に高速化（21個のマイグレーション実行 → 1個のみ）
- 📦 **シンプル**: マイグレーション履歴がクリーンで管理しやすい
- 💾 **安全**: データとスキーマは完全に保持される
- 🔄 **CI/CD改善**: ビルドとデプロイのパフォーマンスが向上

## 今後の開発について

統合後も通常通り開発を続けられます：

```bash
# 新しいマイグレーションの作成
pnpm db:migrate --name add_new_feature

# 本番環境への適用
pnpm db:migrate:deploy
```

新しいマイグレーションは、統合されたマイグレーションの後に順番に適用されます。

## トラブルシューティング

### マイグレーションエラーが発生した場合

```bash
# マイグレーションステータスを確認
pnpm with-env prisma migrate status

# 特定の問題を解決
pnpm with-env prisma migrate resolve
```

### 接続エラーが発生した場合

1. `.env`ファイルの`DATABASE_URL`が正しいか確認
2. PostgreSQLサービスが起動しているか確認
3. データベースへの接続権限があるか確認

### 型エラーが発生した場合

```bash
# @tumiki/dbパッケージを再ビルド
cd packages/db && pnpm build

# プロジェクト全体をクリーンビルド
cd ../.. && pnpm clean && pnpm install && pnpm build
```

## 参考資料

- [Prisma公式ドキュメント: Squashing migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/squashing-migrations)
- [Prisma Migrate resolve コマンド](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-resolve)

---

作成日: 2025年1月11日
更新日: 2025年1月11日