import { join } from "path";
import { app } from "electron";
import { existsSync, mkdirSync } from "fs";
import * as logger from "../utils/logger";
// 型定義のみをインポート
import type { PrismaClient as PrismaClientType } from "../../../prisma/generated/client";

/**
 * Prismaクライアントを動的にインポート
 * パッケージ化されたアプリでは app.asar.unpacked からロード
 */
const getPrismaClientModule =
  (): typeof import("../../../prisma/generated/client") => {
    try {
      // 開発環境では __dirname を基準にした相対パスで読み込み
      // dist-electron/main/ から ../../prisma/generated/client
      if (!app.isPackaged) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const prismaPath = join(__dirname, "..", "..", "prisma", "generated", "client");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(prismaPath);
      }

      // 本番環境では app.asar.unpacked から読み込み
      const appPath = app.getAppPath();
      const unpackedPath = appPath.replace("app.asar", "app.asar.unpacked");
      const prismaPath = join(unpackedPath, "prisma", "generated", "client");

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(prismaPath);
    } catch (error) {
      logger.error(
        "Failed to load Prisma client",
        error instanceof Error ? error : { error },
      );
      throw error;
    }
  };

// Prismaクライアントを遅延ロード（Electronアプリ初期化後に呼び出される）
let PrismaClientClass:
  | typeof import("../../../prisma/generated/client").PrismaClient
  | null = null;

const getPrismaClient =
  (): typeof import("../../../prisma/generated/client").PrismaClient => {
    if (!PrismaClientClass) {
      const module = getPrismaClientModule();
      PrismaClientClass = module.PrismaClient;
    }
    return PrismaClientClass;
  };

// 型エイリアス
type PrismaClient = PrismaClientType;

// 接続タイムアウト設定（ミリ秒）
// 環境変数で設定可能（DESKTOP_DB_TIMEOUT_MS）
// デフォルト: 10秒（UX向上のため30秒から短縮）
const CONNECTION_TIMEOUT_MS =
  Number(process.env.DESKTOP_DB_TIMEOUT_MS) || 10000;

// リトライ設定
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000, // 初回遅延: 1秒
  MAX_DELAY_MS: 15000, // 最大遅延: 15秒（5秒から延長）
} as const;

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
const getPrismaConfig = (): ConstructorParameters<
  typeof PrismaClientType
>[0] => {
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
  const PrismaClientConstructor = getPrismaClient();
  const client = new PrismaClientConstructor(getPrismaConfig());

  try {
    await client.$connect();
    logger.debug("Database connection established");
    return client;
  } catch (error) {
    // 接続失敗時はクリーンアップ
    await client.$disconnect().catch((disconnectError: unknown) => {
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
 *
 * 設計方針:
 * - シングルトンパターン: 単一のPrismaClientインスタンスを再利用
 * - ミューテックス: connectionPromiseで同時接続要求を制御
 * - リトライ: 指数バックオフで一時的な障害に対応
 * - タイムアウト: 30秒で接続をタイムアウト
 */
const createConnectionManager = (): ConnectionManager => {
  // シングルトンインスタンス
  let prisma: PrismaClient | undefined;
  // 同時接続要求を防ぐためのPromise（ミューテックス）
  let connectionPromise: Promise<PrismaClient> | null = null;

  /**
   * リトライ機能付き接続作成（タイムアウト付き）
   * 指数バックオフで一時的な障害に対応
   * @returns PrismaClientインスタンス
   */
  const createConnectionWithRetry = async (): Promise<PrismaClient> => {
    let lastError: Error | undefined;
    const { MAX_RETRIES, INITIAL_DELAY_MS, MAX_DELAY_MS } = RETRY_CONFIG;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
          `Database connection attempt ${attempt + 1}/${MAX_RETRIES} failed`,
          { error: err.message, stack: err.stack },
        );

        // 最後の試行でない場合は待機してからリトライ
        if (attempt < MAX_RETRIES - 1) {
          // 指数バックオフ: 1秒 → 2秒 → 4秒 → 8秒 → 15秒（最大）
          const delay = Math.min(
            INITIAL_DELAY_MS * Math.pow(2, attempt),
            MAX_DELAY_MS,
          );
          logger.debug(`Retrying database connection in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // すべてのリトライが失敗した場合
    throw lastError || new Error("Unknown database connection error");
  };

  return {
    /**
     * データベース接続を取得（ミューテックスパターン）
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

      // 新しい接続を作成
      connectionPromise = (async () => {
        const currentPromise = connectionPromise;
        try {
          const client = await createConnectionWithRetry();
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
