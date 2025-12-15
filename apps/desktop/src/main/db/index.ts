import { PrismaClient } from "../../../prisma/generated/client";
import { join } from "path";
import { app } from "electron";
import { existsSync, mkdirSync } from "fs";
import * as logger from "../utils/logger";

// 接続タイムアウト設定（ミリ秒）
const CONNECTION_TIMEOUT_MS = 30000; // 30秒

/**
 * エラーを安全にError型に変換
 * unknown型のエラーをError型に変換し、型安全性を向上
 */
const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

/**
 * タイムアウト付きでPromiseを実行
 * @param promise 実行するPromise
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @param operationName 操作名（エラーメッセージ用）
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

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
const getPrismaConfig = (): ConstructorParameters<typeof PrismaClient>[0] => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    datasources: {
      db: {
        url: getDatabasePath(),
      },
    },
    log: isDevelopment ? ["error", "warn"] : ["error"],
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

/**
 * DB接続管理のための状態管理
 */
type ConnectionManager = {
  getConnection: () => Promise<PrismaClient>;
  closeConnection: () => Promise<void>;
  isConnected: () => boolean;
};

/**
 * 接続マネージャーを作成
 * シングルトンパターンで接続を管理し、競合状態を回避
 */
const createConnectionManager = (): ConnectionManager => {
  let prisma: PrismaClient | undefined;
  let connectionPromise: Promise<PrismaClient> | null = null;

  /**
   * リトライ機能付き接続作成（タイムアウト付き）
   * @param retries リトライ回数
   * @returns PrismaClientインスタンス
   */
  const createConnectionWithRetry = async (
    retries = 3,
  ): Promise<PrismaClient> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // 各接続試行にタイムアウトを設定
        const client = await withTimeout(
          createConnection(),
          CONNECTION_TIMEOUT_MS,
          "Database connection",
        );
        return client;
      } catch (error) {
        const err = toError(error);
        lastError = err;
        logger.warn(
          `Database connection attempt ${attempt + 1}/${retries} failed`,
          { error: err.message, stack: err.stack },
        );

        // 最後の試行でない場合は待機してからリトライ
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // 指数バックオフ（最大5秒）
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // すべてのリトライが失敗した場合
    throw lastError || new Error("Unknown database connection error");
  };

  return {
    /**
     * データベース接続を取得
     *
     * ミューテックスパターン実装:
     * - 既存接続があれば即座に返す
     * - 接続中の場合は同じPromiseを返して競合を回避
     * - 新規接続時はconnectionPromiseで排他制御
     * - エラー時はPromiseをクリアして再試行可能にする
     */
    getConnection: async (): Promise<PrismaClient> => {
      // 既存の接続がある場合はそれを返す
      if (prisma) {
        return prisma;
      }

      // 既に接続中の場合は同じPromiseを返す（競合状態を回避）
      if (connectionPromise) {
        try {
          return await connectionPromise;
        } catch (error) {
          // 失敗したPromiseをクリアして再試行可能にする
          connectionPromise = null;
          throw error;
        }
      }

      // 新しい接続を作成（排他制御されている）
      connectionPromise = (async () => {
        // 現在のPromiseを参照保持して、競合状態を回避
        const currentPromise = connectionPromise;
        try {
          const client = await createConnectionWithRetry(3);
          // 接続成功時にクロージャ内の変数に保存
          prisma = client;
          return client;
        } catch (error) {
          const err = toError(error);
          logger.error("Failed to create database connection after retries", {
            error: err.message,
            stack: err.stack,
          });
          // エラー時も確実にprismaをクリアして、再接続を確実にする
          prisma = undefined;
          throw err;
        } finally {
          // 現在のPromiseと一致する場合のみクリア（競合状態を防ぐ）
          if (connectionPromise === currentPromise) {
            connectionPromise = null;
          }
        }
      })();

      try {
        return await connectionPromise;
      } catch (error) {
        // 失敗したPromiseをクリアして再試行可能にする
        connectionPromise = null;
        throw error;
      }
    },

    /**
     * データベース接続をクリーンアップ
     */
    closeConnection: async (): Promise<void> => {
      if (prisma) {
        try {
          await prisma.$disconnect();
          logger.debug("Database connection closed");
          prisma = undefined;
        } catch (error) {
          const err = toError(error);
          logger.error("Failed to close database connection", {
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      }
    },

    /**
     * 接続状態を確認
     */
    isConnected: (): boolean => {
      return prisma !== undefined;
    },
  };
};

// グローバルな接続マネージャーのインスタンス
const connectionManager = createConnectionManager();

/**
 * データベース接続を取得
 * @deprecated 直接 connectionManager.getConnection() を使用することを推奨
 */
export const getDb = async (): Promise<PrismaClient> => {
  return connectionManager.getConnection();
};

/**
 * データベース初期化
 * アプリケーション起動時に接続を確立し、接続状態を確認
 */
export const initializeDb = async (): Promise<void> => {
  try {
    const db = await connectionManager.getConnection();

    // データベース接続を確認（簡単なクエリを実行）
    await db.$queryRaw`SELECT 1`;
    logger.info("Database initialized and connection verified");
  } catch (error) {
    const err = toError(error);
    logger.error("Failed to initialize database", {
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
};

/**
 * データベース接続をクリーンアップ
 * アプリケーション終了時に呼び出される
 */
export const closeDb = async (): Promise<void> => {
  await connectionManager.closeConnection();
};
