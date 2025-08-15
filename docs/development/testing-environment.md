# テスト環境セットアップガイド

Tumikiプロジェクトのテスト環境の構築と実行方法について説明します。

## 概要

Tumikiプロジェクトでは、以下の2種類のテストを実行します：

- **ユニットテスト**: ビジネスロジックとユーティリティ関数のテスト
- **データベーステスト**: Prisma ORM、ファクトリー、データベースクエリのテスト

データベーステストを実行するためには、専用のテスト用PostgreSQLデータベースが必要です。

## データベーステスト環境

### 必要な環境

- Docker（PostgreSQLテストコンテナ用）
- Node.js >=22.14.0
- pnpm >=10.11.0

### 1. テスト用データベースの起動

```bash
# テスト用PostgreSQLコンテナを起動
docker compose -f ./docker/compose.dev.yaml up -d db-test
```

このコマンドにより、以下の設定でPostgreSQLコンテナが起動します：

- **コンテナ名**: `db-test`
- **ポート**: `5433`
- **データベース名**: `tumiki_test`
- **ユーザー**: `root`
- **パスワード**: `password`

### 2. 環境変数の確認

`.env.test` ファイルにテスト用データベースの接続情報が設定されていることを確認してください：

```env
DATABASE_URL="postgresql://root:password@localhost:5433/tumiki_test"
```

### 3. テスト用データベースのスキーマ適用

```bash
# packages/db ディレクトリに移動
cd packages/db

# テスト用データベースにスキーマを適用
pnpm db:push:test
```

### 4. テストの実行

```bash
# 全てのテストを実行
pnpm test

# 特定のパッケージのテストのみ実行
cd packages/db
pnpm test

# ウォッチモードでテスト実行
pnpm test:watch

# カバレッジ測定付きでテスト実行
pnpm test:coverage
```

## テスト環境の詳細

### vitest-environment-vprisma

データベーステストでは `vitest-environment-vprisma` を使用しています。この環境により：

- **トランザクション分離**: 各テストが独立したトランザクション内で実行される
- **自動ロールバック**: テスト終了時に自動的にデータがクリーンアップされる
- **並列実行**: テスト間でのデータ競合を防ぎながら並列実行が可能

### ファクトリーパターン

`packages/db/src/testing/factories/` にはテストデータ生成用のファクトリーが配置されています：

```typescript
// ユーザーファクトリーの使用例
import { UserFactory, AdminUserFactory } from "@tumiki/db/testing";

// 基本的なユーザー作成
const user = await UserFactory.create();

// カスタムデータでユーザー作成
const customUser = await UserFactory.create({
  email: "custom@example.com",
  name: "Custom User",
});

// 管理者ユーザー作成
const admin = await AdminUserFactory.create();

// 複数ユーザー作成
const users = await UserFactory.createList(5);
```

## トラブルシューティング

### テスト用データベースコンテナが起動しない

```bash
# コンテナの状況確認
docker ps -a

# コンテナログの確認
docker logs db-test

# コンテナの強制再作成
docker compose -f ./docker/compose.dev.yaml down
docker compose -f ./docker/compose.dev.yaml up -d db-test
```

### マイグレーションエラーが発生する場合

```bash
# マイグレーション状態をリセット
cd packages/db
pnpm with-env-test prisma migrate reset --force

# スキーマを直接適用（推奨）
pnpm db:push:test
```

### 環境変数が読み込まれない場合

```bash
# .env.test ファイルの存在確認
ls -la .env.test

# 環境変数の内容確認
cat .env.test | grep DATABASE_URL
```

## 利用可能なコマンド

### データベース関連

```bash
# テスト環境用コマンド
pnpm db:push:test       # テスト用DBにスキーマをプッシュ
pnpm db:deploy:test     # テスト用DBにマイグレーションを適用

# 開発環境用コマンド
pnpm db:generate        # Prisma クライアント生成
pnpm db:migrate         # マイグレーション実行
pnpm db:studio          # Prisma Studio 起動
```

### テスト実行関連

```bash
pnpm test               # 全テスト実行
pnpm test:watch         # ウォッチモード
pnpm test:coverage      # カバレッジ測定
```

## 参考

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [vitest-environment-vprisma](https://github.com/quramy/vitest-environment-vprisma)
