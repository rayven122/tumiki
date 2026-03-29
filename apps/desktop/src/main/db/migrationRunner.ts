import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { app } from "electron";
import { randomUUID } from "crypto";
import type { PrismaClient } from "../../../prisma/generated/client";
import * as logger from "../utils/logger";

/**
 * マイグレーションファイルのディレクトリパスを解決
 * 開発時とプロダクションビルドでパスが異なる
 */
const getMigrationsDir = (): string => {
  if (app.isPackaged) {
    // asarUnpackされたファイルは app.asar.unpacked に展開される
    const appPath = app.getAppPath();
    const unpackedPath = appPath.replace("app.asar", "app.asar.unpacked");
    return join(unpackedPath, "prisma", "migrations");
  }
  // 開発時: app.getAppPath() は apps/desktop/ を指す
  return join(app.getAppPath(), "prisma", "migrations");
};

/**
 * SQLファイルを個別のステートメントに分割
 * セミコロン区切りで分割し、空文字とコメント行のみの要素を除去
 */
const splitSql = (sql: string): string[] =>
  sql
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);

/**
 * Prismaマイグレーションをアプリ起動時に適用
 *
 * prisma/migrations/ 配下のディレクトリを昇順で列挙し、
 * _prisma_migrations テーブルに記録されていない未適用のマイグレーションを順番に実行する。
 *
 * スキーマ変更手順:
 *   1. prisma/schema.prisma を変更
 *   2. pnpm db:migrate --name <変更内容> でSQLを自動生成
 *   3. pnpm prisma generate で型を再生成
 */
export const runMigrations = async (db: PrismaClient): Promise<void> => {
  // マイグレーション追跡テーブルを作成（自己ブートストラップ）
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "migration_name" TEXT NOT NULL,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 適用済みマイグレーション一覧を取得
  const applied = await db.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
  `;
  const appliedSet = new Set(applied.map((r) => r.migration_name));

  // マイグレーションディレクトリを昇順で列挙（タイムスタンプ付き名前でソート確定）
  const migrationsDir = getMigrationsDir();
  const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of migrationNames) {
    if (appliedSet.has(name)) continue;

    const sqlPath = join(migrationsDir, name, "migration.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    logger.info(`Applying migration: ${name}`);

    for (const statement of splitSql(sql)) {
      await db.$executeRawUnsafe(statement);
    }

    await db.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" (id, migration_name) VALUES (?, ?)`,
      randomUUID(),
      name,
    );

    logger.info(`Migration applied: ${name}`);
  }

  logger.debug("Database migrations completed");
};
