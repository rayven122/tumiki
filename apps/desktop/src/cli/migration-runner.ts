/**
 * Electron非依存のマイグレーションランナー
 * Desktop側の migrationRunner.ts と同等の処理をElectronなしで行う
 */
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/desktop-client";
import { fileURLToPath } from "url";

/**
 * マイグレーションディレクトリのパスを解決
 * ビルド後の dist-electron/main/mcp-proxy-cli.cjs からの相対パスで prisma/migrations/ を参照
 */
const getMigrationsDir = (): string => {
  // CJS環境: __dirname が使えるが、ESM環境にも対応
  const baseDir =
    typeof __dirname !== "undefined"
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));

  // dist-electron/main/ → apps/desktop/prisma/migrations/
  return join(baseDir, "../../prisma/migrations");
};

/**
 * SQLファイルを個別ステートメントに分割（Desktop側と同一ロジック）
 */
const splitSql = (sql: string): string[] =>
  sql
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .map((line) => {
          const commentIdx = line.indexOf("--");
          return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
        })
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);

/**
 * マイグレーションを適用
 */
export const runMigrations = async (db: PrismaClient): Promise<void> => {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_tumiki_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "migration_name" TEXT NOT NULL,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = await db.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_tumiki_migrations"
  `;
  const appliedSet = new Set(applied.map((r) => r.migration_name));

  const migrationsDir = getMigrationsDir();
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationNames = entries
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of migrationNames) {
    if (appliedSet.has(name)) continue;

    const sqlPath = join(migrationsDir, name, "migration.sql");
    const sql = await readFile(sqlPath, "utf-8");

    process.stderr.write(`[tumiki] マイグレーション適用中: ${name}\n`);

    await db.$transaction(async (tx) => {
      for (const statement of splitSql(sql)) {
        await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRawUnsafe(
        `INSERT INTO "_tumiki_migrations" (id, migration_name) VALUES (?, ?)`,
        randomUUID(),
        name,
      );
    });
  }
};
