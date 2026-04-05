import { PrismaClient } from "@prisma/desktop-client";
import { join } from "path";
import {
  readFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
  statSync,
} from "fs";

const MIGRATIONS_DIR = join(__dirname, "../../../../prisma/migrations");

/**
 * テスト用SQLite DBを作成し、全マイグレーション適用済みのPrismaClientを返す
 */
export const createTestDb = async (dbPath: string): Promise<PrismaClient> => {
  // 既存のDBファイルを削除
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }

  const db = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });

  // 全マイグレーションSQLをソート順に実行
  const migrationDirs = readdirSync(MIGRATIONS_DIR)
    .filter((entry) => {
      const fullPath = join(MIGRATIONS_DIR, entry);
      return statSync(fullPath).isDirectory();
    })
    .sort();

  for (const dir of migrationDirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!existsSync(sqlPath)) continue;

    const migrationSql = readFileSync(sqlPath, "utf8");
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
