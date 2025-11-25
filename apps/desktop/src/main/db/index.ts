import { PrismaClient } from "../../../prisma/generated/client";
import { join } from "path";
import { app } from "electron";
import { existsSync, mkdirSync } from "fs";

const getDatabasePath = (): string => {
  // Electron app が実行中の場合は userData ディレクトリを使用
  // そうでない場合は環境変数から取得（テスト環境など）
  if (app && app.getPath) {
    const userDataPath = app.getPath("userData");
    const dbPath = join(userDataPath, "desktop.db");

    // userData ディレクトリが存在しない場合は作成
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }

    return `file:${dbPath}`;
  }

  return process.env.DESKTOP_DATABASE_URL || "file:./data/desktop.db";
};

let prisma: PrismaClient;

export const getDb = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: getDatabasePath(),
        },
      },
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  return prisma;
};

// データベース初期化（必要なテーブルを作成）
export const initializeDb = async (): Promise<void> => {
  const db = getDb();

  try {
    // Prisma migrate deploy を実行してスキーマを適用
    // SQLiteの場合、db pushと同等の処理を行う
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "auth_tokens" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "log_sync_queue" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "serverId" TEXT NOT NULL,
        "logEntry" TEXT NOT NULL,
        "syncStatus" TEXT NOT NULL DEFAULT 'pending',
        "retryCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "syncedAt" DATETIME
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "log_sync_queue_syncStatus_idx" ON "log_sync_queue"("syncStatus");
    `);

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "log_sync_queue_serverId_idx" ON "log_sync_queue"("serverId");
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

// アプリケーション終了時にデータベース接続をクリーンアップ
export const closeDb = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
  }
};
