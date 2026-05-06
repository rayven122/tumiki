import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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
 *
 * さらに、マイグレーションごとに `pnpm exec prisma` を spawn すると
 * テストファイル並列実行時に `beforeAll` が hookTimeout (30s) を超過していた。
 * 全マイグレーションを一時ファイルに連結して 1 回の spawn にまとめる。
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

  const combinedSql = migrationDirs
    .map((dir) => {
      const sqlPath = join(MIGRATIONS_DIR, dir, "migration.sql");
      if (!existsSync(sqlPath)) return "";
      return `-- migration: ${dir}\n${readFileSync(sqlPath, "utf8")}\n`;
    })
    .filter(Boolean)
    .join("\n");

  const tmpDir = mkdtempSync(join(tmpdir(), "tumiki-desktop-test-db-"));
  const combinedSqlPath = join(tmpDir, "combined-migrations.sql");
  try {
    writeFileSync(combinedSqlPath, combinedSql);

    execFileSync(
      "pnpm",
      [
        "exec",
        "prisma",
        "db",
        "execute",
        "--file",
        combinedSqlPath,
        "--url",
        databaseUrl,
      ],
      {
        cwd: DESKTOP_ROOT,
        stdio: "pipe",
      },
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
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
