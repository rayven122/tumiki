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

let prisma: PrismaClient | undefined;
let isConnecting = false;

/**
 * データベース接続を取得
 * 接続失敗時は自動的にリトライする
 */
export const getDb = async (): Promise<PrismaClient> => {
  // 既に接続中の場合は待機
  if (isConnecting) {
    while (isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // 既存の接続がある場合はそれを返す
  if (prisma) {
    return prisma;
  }

  isConnecting = true;

  try {
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

    // 接続テスト
    await prisma.$connect();
    return prisma;
  } catch (error) {
    // 接続失敗時はクリーンアップ
    if (prisma) {
      await prisma.$disconnect().catch(() => {
        // 切断エラーは無視
      });
      prisma = undefined;
    }
    throw error;
  } finally {
    isConnecting = false;
  }
};

/**
 * 同期的にデータベース接続を取得（既存の互換性のため）
 * 注意: 新しいコードでは getDb() を使用してください
 */
export const getDbSync = (): PrismaClient => {
  if (!prisma) {
    throw new Error("Database not initialized. Call getDb() first.");
  }
  return prisma;
};

/**
 * データベース初期化
 * Prisma スキーマに基づいてテーブルが自動的に作成される
 * アプリケーション起動前に `pnpm db:push` を実行する必要がある
 */
export const initializeDb = async (): Promise<void> => {
  try {
    const db = await getDb();

    // データベース接続を確認
    await db.$queryRaw`SELECT 1`;
    console.log("Database connection verified");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
};

// アプリケーション終了時にデータベース接続をクリーンアップ
export const closeDb = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
  }
};
