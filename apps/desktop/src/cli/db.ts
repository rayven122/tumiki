/**
 * Electron非依存のDB接続モジュール
 * CLIモード（--mcp-proxy）専用。Electron APIを使わずにSQLiteに接続する。
 */
import { PrismaClient } from "@prisma/desktop-client";
import { join } from "path";
import { resolveUserDataPath } from "../shared/user-data-path";

/**
 * DBパスを取得
 * 環境変数 DESKTOP_DATABASE_URL が設定されている場合はそれを優先
 */
const getDatabasePath = (): string => {
  if (process.env.DESKTOP_DATABASE_URL) {
    return process.env.DESKTOP_DATABASE_URL;
  }
  const dbPath = join(resolveUserDataPath(), "desktop.db");
  return `file:${dbPath}`;
};

let prisma: PrismaClient | null = null;

export const getDb = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: getDatabasePath() } },
      log: ["error"],
    });
  }
  return prisma;
};

export const closeDb = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};
