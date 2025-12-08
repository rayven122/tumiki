import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./db";
import { setupAuthIpc } from "./ipc/auth";
import { OAuthManager } from "./auth/oauth-manager";
import { getKeycloakEnv } from "./utils/env";
import * as logger from "./utils/logger";

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let oauthManager: OAuthManager | null = null;

// カスタムURLスキームの登録（tumiki-desktop://）
const CUSTOM_PROTOCOL = "tumiki-desktop";

// macOS/Linux: カスタムプロトコルをデフォルトプロトコルハンドラーとして設定
// 開発環境ではappが未定義の場合があるのでチェック
if (app && typeof app.setAsDefaultProtocolClient === "function") {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL, process.execPath, [
        process.argv[1] ?? "",
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL);
  }
}

// シングルインスタンスロック
// 複数のアプリインスタンスが起動するのを防ぐ
const gotTheLock = app ? app.requestSingleInstanceLock() : true;

if (!gotTheLock && app) {
  // 既にインスタンスが存在する場合は終了
  app.quit();
} else if (app) {
  // 2つ目のインスタンスが起動しようとした時の処理
  app.on("second-instance", (_, commandLine) => {
    // ウィンドウがあれば表示
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }

    // Windows/Linux: コマンドライン引数からカスタムURLを取得
    const url = commandLine.find((arg) =>
      arg.startsWith(`${CUSTOM_PROTOCOL}://`),
    );
    if (url && oauthManager) {
      handleDeepLink(url).catch((error) => {
        logger.error("Failed to handle deep link from second instance", error);
      });
    }
  });
}

/**
 * Deep linkを処理
 */
const handleDeepLink = async (url: string): Promise<void> => {
  logger.info(`Handling deep link: ${url}`);

  if (!oauthManager) {
    logger.error("OAuth manager not initialized");
    return;
  }

  try {
    await oauthManager.handleAuthCallback(url);
    logger.info("Deep link handled successfully");

    // 認証成功をレンダラープロセスに通知
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auth:callback-success");
    }
  } catch (error) {
    logger.error(
      "Failed to handle deep link",
      error instanceof Error ? error : { error },
    );

    // 認証失敗をレンダラープロセスに通知
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "auth:callback-error",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }
};

// macOS: カスタムURLスキームで開かれた時
if (app && typeof app.on === "function") {
  app.on("open-url", (event, url) => {
    event.preventDefault();

    if (url.startsWith(`${CUSTOM_PROTOCOL}://`)) {
      handleDeepLink(url).catch((error) => {
        logger.error("Failed to handle deep link from open-url", error);
      });
    }
  });
}

const createWindow = (): void => {
  mainWindow = createMainWindow();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

/**
 * OAuthマネージャーを初期化
 */
const initializeOAuthManager = async (): Promise<void> => {
  try {
    const keycloakEnv = getKeycloakEnv();

    oauthManager = new OAuthManager({
      issuer: keycloakEnv.KEYCLOAK_ISSUER,
      clientId: keycloakEnv.KEYCLOAK_CLIENT_ID,
      clientSecret: keycloakEnv.KEYCLOAK_CLIENT_SECRET,
      redirectUri: `${CUSTOM_PROTOCOL}://callback`,
    });

    // 既存のトークンがあれば自動リフレッシュを開始
    await oauthManager.initialize();

    logger.info("OAuth manager initialized successfully");
  } catch (error) {
    logger.error(
      "Failed to initialize OAuth manager",
      error instanceof Error ? error : { error },
    );
    throw error;
  }
};

/**
 * OAuthマネージャーを取得
 */
export const getOAuthManager = (): OAuthManager => {
  if (!oauthManager) {
    throw new Error("OAuth manager not initialized");
  }
  return oauthManager;
};

// アプリケーション準備完了時
if (app && typeof app.whenReady === "function") {
  app
    .whenReady()
    .then(async () => {
      // データベース初期化
      await initializeDb();

      // OAuthマネージャー初期化
      await initializeOAuthManager();

      // IPC ハンドラー登録
      setupAuthIpc();

      createWindow();

      // Windows/Linux: コマンドライン引数からカスタムURLを取得（初回起動時）
      if (process.platform === "win32" || process.platform === "linux") {
        const url = process.argv.find((arg) =>
          arg.startsWith(`${CUSTOM_PROTOCOL}://`),
        );
        if (url && oauthManager) {
          // ウィンドウが完全に作成されるまで少し待つ
          setTimeout(() => {
            handleDeepLink(url).catch((error) => {
              logger.error("Failed to handle deep link from argv", error);
            });
          }, 1000);
        }
      }

      app.on("activate", () => {
        // macOSでDockアイコンクリック時、ウィンドウがなければ作成
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    })
    .catch((error) => {
      logger.error("Failed to initialize application", error);
      if (app) app.quit();
    });

  // すべてのウィンドウが閉じられた時
  app.on("window-all-closed", () => {
    // macOS以外はアプリケーションを終了
    if (process.platform !== "darwin") {
      if (app) app.quit();
    }
  });

  // アプリケーション終了前にクリーンアップ
  app.on("before-quit", async (event) => {
    // 既にクリーンアップ処理中の場合は何もしない
    if (isQuitting) {
      return;
    }

    // イベントをキャンセルして非同期処理を完了させる
    event.preventDefault();
    isQuitting = true;

    try {
      // OAuthマネージャーのクリーンアップ
      if (oauthManager) {
        oauthManager.stopAutoRefresh();
      }

      // データベース接続をクローズ
      await closeDb();
      logger.info("Database connection closed successfully");
    } catch (error) {
      logger.error(
        "Failed to cleanup during app quit",
        error instanceof Error ? error : { error },
      );
    } finally {
      // クリーンアップ処理が完了したら、アプリを終了
      if (app) app.quit();
    }
  });
}
