import { PrismaClient } from "../../../prisma/generated/client";
import { join } from "path";
import { app } from "electron";
import { existsSync, mkdirSync } from "fs";
import * as logger from "../utils/logger";

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
let connectionPromise: Promise<PrismaClient> | null = null;

/**
 * データベース接続を取得
 * 接続失敗時は自動的にリトライする
 */
export const getDb = async (): Promise<PrismaClient> => {
  // 既存の接続がある場合はそれを返す
  if (prisma) {
    return prisma;
  }

  // 既に接続中の場合は同じPromiseを返す（競合状態を回避）
  if (connectionPromise) {
    return await connectionPromise;
  }

  // 新しい接続を作成
  connectionPromise = (async () => {
    let tempPrisma: PrismaClient | undefined;

    try {
      tempPrisma = new PrismaClient({
        datasources: {
          db: {
            url: getDatabasePath(),
          },
        },
        log:
          process.env.NODE_ENV === "development"
            ? ["error", "warn"]
            : ["error"],
      });

      // 接続テスト
      await tempPrisma.$connect();
      prisma = tempPrisma;
      return prisma;
    } catch (error) {
      // 接続失敗時はクリーンアップ
      if (tempPrisma) {
        await tempPrisma.$disconnect().catch(() => {
          // 切断エラーは無視
        });
      }
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return await connectionPromise;
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
    logger.info("Database connection verified");
  } catch (error) {
    logger.error(
      "Failed to connect to database",
      error instanceof Error ? error : { error },
    );
    throw error;
  }
};

// アプリケーション終了時にデータベース接続をクリーンアップ
export const closeDb = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
  }
};
