import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/desktop-client";

/** apps/desktop（prisma 一式があるディレクトリ） */
const DESKTOP_ROOT = join(__dirname, "../../../..");
const MIGRATIONS_DIR = join(DESKTOP_ROOT, "prisma/migrations");

/**
 * テスト用SQLite DBを作成し、全マイグレーション適用済みのPrismaClientを返す
 *
 * 以前は migration.sql を `;` で分割して `$executeRawUnsafe` していたが、
 * CREATE 文と CREATE INDEX が 1 ステートメントとして結合されるなど環境依存で壊れ、
 * UNIQUE インデックス未作成のままになり `upsert` が失敗することがあった。
 * `prisma db execute --file` はスクリプト全文を一度に送るため分割不要。
 * （OAuth 周りのコード変更とは無関係で、マイグレーション SQL・テストヘルパー側の問題。）
 */
export const createTestDb = async (dbPath: string): Promise<PrismaClient> => {
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  const journalPath = `${dbPath}-journal`;
  if (existsSync(journalPath)) {
    unlinkSync(journalPath);
  }

  const databaseUrl = pathToFileURL(resolve(dbPath)).href;

  const migrationDirs = readdirSync(MIGRATIONS_DIR)
    .filter((name) => statSync(join(MIGRATIONS_DIR, name)).isDirectory())
    .sort();

  for (const dir of migrationDirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!existsSync(sqlPath)) continue;

    execFileSync(
      "pnpm",
      [
        "exec",
        "prisma",
        "db",
        "execute",
        "--file",
        sqlPath,
        "--url",
        databaseUrl,
      ],
      {
        cwd: DESKTOP_ROOT,
        stdio: "pipe",
      },
    );
  }

  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
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
