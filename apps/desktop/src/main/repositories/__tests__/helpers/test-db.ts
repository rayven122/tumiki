import { PrismaClient } from "../../../../../prisma/generated/client";
import { join } from "path";
import { readFileSync, unlinkSync, existsSync } from "fs";

const MIGRATION_SQL_PATH = join(
  __dirname,
  "../../../../../prisma/migrations/20260330004248_init/migration.sql",
);

/**
 * テスト用SQLite DBを作成し、マイグレーション済みPrismaClientを返す
 */
export const createTestDb = async (dbPath: string): Promise<PrismaClient> => {
  // 既存のDBファイルを削除
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }

  const db = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });

  // マイグレーションSQLを実行してテーブルを作成
  const migrationSql = readFileSync(MIGRATION_SQL_PATH, "utf8");
  const statements = migrationSql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.$executeRawUnsafe(`${statement};`);
  }

  return db;
};

/**
 * テスト用DBをクリーンアップ（disconnect + ファイル削除）
 */
export const cleanupTestDb = async (
  db: PrismaClient,
  dbPath: string,
): Promise<void> => {
  await db.$disconnect();
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  const journalPath = `${dbPath}-journal`;
  if (existsSync(journalPath)) {
    unlinkSync(journalPath);
  }
};
