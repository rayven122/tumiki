import { PrismaClient } from "../../../prisma/generated/client";
import { join } from "path";
import { app } from "electron";
import { existsSync, mkdirSync } from "fs";
import * as logger from "../utils/logger";

/**
 * データベースパスを取得
 * Electronアプリ実行中はuserDataディレクトリ、それ以外は環境変数またはデフォルトパスを使用
 */
const getDatabasePath = (): string => {
  // Electron app が実行中の場合は userData ディレクトリを使用
  if (app && app.getPath) {
    const userDataPath = app.getPath("userData");
    const dbPath = join(userDataPath, "desktop.db");

    // userData ディレクトリが存在しない場合は作成
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }

    return `file:${dbPath}`;
  }

  // テスト環境など
  return process.env.DESKTOP_DATABASE_URL || "file:./data/desktop.db";
};

/**
 * Prismaクライアントの設定を取得
 */
const getPrismaConfig = () => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    datasources: {
      db: {
        url: getDatabasePath(),
      },
    },
    log: isDevelopment
      ? (["error", "warn"] as ["error", "warn"])
      : (["error"] as ["error"]),
  };
};

/**
 * 新しいPrisma接続を作成して接続テストを実行
 */
const createConnection = async (): Promise<PrismaClient> => {
  const client = new PrismaClient(getPrismaConfig());

  try {
    await client.$connect();
    logger.debug("Database connection established");
    return client;
  } catch (error) {
    // 接続失敗時はクリーンアップ
    await client.$disconnect().catch((disconnectError) => {
      logger.debug("Failed to disconnect after connection error", {
        disconnectError,
      });
    });
    throw error;
  }
};

// グローバル接続状態
let prisma: PrismaClient | undefined;
let connectionPromise: Promise<PrismaClient> | null = null;

/**
 * データベース接続を取得
 * シングルトンパターンで接続を管理し、競合状態を回避
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
  connectionPromise = createConnection()
    .then((client) => {
      prisma = client;
      return client;
    })
    .catch((error) => {
      logger.error("Failed to create database connection", error);
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return await connectionPromise;
};

/**
 * データベース初期化
 * アプリケーション起動時に接続を確立し、接続状態を確認
 */
export const initializeDb = async (): Promise<void> => {
  try {
    const db = await getDb();

    // データベース接続を確認（簡単なクエリを実行）
    await db.$queryRaw`SELECT 1`;
    logger.info("Database initialized and connection verified");
  } catch (error) {
    logger.error(
      "Failed to initialize database",
      error instanceof Error ? error : { error },
    );
    throw error;
  }
};

/**
 * データベース接続をクリーンアップ
 * アプリケーション終了時に呼び出される
 */
export const closeDb = async (): Promise<void> => {
  if (prisma) {
    try {
      await prisma.$disconnect();
      logger.debug("Database connection closed");
      prisma = undefined;
    } catch (error) {
      logger.error(
        "Failed to close database connection",
        error instanceof Error ? error : { error },
      );
      throw error;
    }
  }
};
