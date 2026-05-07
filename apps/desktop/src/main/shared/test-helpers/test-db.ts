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

// $executeRawUnsafe での `;` 分割は CREATE 文の結合で UNIQUE INDEX を取りこぼすため不採用。
// 全マイグレーション SQL を一時ファイルへ連結し prisma db execute を 1 回だけ呼ぶ。
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
    .flatMap((dir) => {
      const sqlPath = join(MIGRATIONS_DIR, dir, "migration.sql");
      if (!existsSync(sqlPath)) return [];
      return [`-- migration: ${dir}\n${readFileSync(sqlPath, "utf8")}\n`];
    })
    .join("\n");

  // マイグレーションが 0 件のときは prisma 呼び出しをスキップ（旧動作と整合）
  if (combinedSql.length > 0) {
    const tmpDir = mkdtempSync(join(tmpdir(), "tumiki-desktop-test-db-"));
    const combinedSqlPath = join(tmpDir, "combined-migrations.sql");
    try {
      writeFileSync(combinedSqlPath, combinedSql, "utf8");

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
