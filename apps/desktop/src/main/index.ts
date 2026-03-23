import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./db";
import { setupAuthIpc } from "./ipc/auth";
import { OAuthManager } from "./auth/oauth-manager";
import {
  getOAuthManager,
  setOAuthManager,
} from "./auth/manager-registry";
import { getKeycloakEnvOptional } from "./utils/env";
import * as logger from "./utils/logger";

const PROTOCOL = "tumiki-desktop";
const CALLBACK_PATH = "auth/callback";

// シングルインスタンスロック（Windows/Linuxでsecond-instanceイベントに必要）
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = createMainWindow();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

/**
 * カスタムURLスキーム（tumiki-desktop://）のコールバックを処理
 */
const handleDeepLink = async (url: string): Promise<void> => {
  const expectedPrefix = `${PROTOCOL}://${CALLBACK_PATH}`;
  if (!url.startsWith(expectedPrefix)) {
    logger.warn("Received unknown deep link", { url });
    return;
  }

  const manager = getOAuthManager();
  if (!manager) {
    logger.error("OAuthManager not initialized when handling deep link");
    mainWindow?.webContents.send(
      "auth:callbackError",
      "認証マネージャーが初期化されていません",
    );
    return;
  }

  try {
    await manager.handleAuthCallback(url);
    mainWindow?.webContents.send("auth:callbackSuccess");
    logger.info("Deep link auth callback handled successfully");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "認証コールバックに失敗しました";
    mainWindow?.webContents.send("auth:callbackError", message);
    logger.error("Deep link auth callback failed", { error });
  }

  // コールバック後にウィンドウをフォーカス
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
};

// macOS: アプリが既に起動している場合のディープリンク処理
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// カスタムURLスキームを登録
if (!app.isDefaultProtocolClient(PROTOCOL)) {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// アプリケーション準備完了時
app
  .whenReady()
  .then(async () => {
    // データベース初期化
    await initializeDb();

    // OAuthManager初期化（環境変数が設定されている場合のみ）
    const keycloakEnv = getKeycloakEnvOptional();
    if (keycloakEnv) {
      const manager = new OAuthManager({
        issuer: keycloakEnv.KEYCLOAK_ISSUER,
        clientId: keycloakEnv.KEYCLOAK_DESKTOP_CLIENT_ID,
        redirectUri: `${PROTOCOL}://${CALLBACK_PATH}`,
      });
      setOAuthManager(manager);
      await manager.initialize();
      logger.info("OAuthManager initialized");
    } else {
      logger.warn("Keycloak environment variables not set, OAuth disabled");
    }

    // IPC ハンドラー登録
    setupAuthIpc();

    createWindow();

    // Windows/Linux: second-instanceイベントでディープリンクを処理
    app.on("second-instance", (_event, argv) => {
      // argv末尾にURLが含まれる
      const deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
      if (deepLinkUrl) {
        handleDeepLink(deepLinkUrl);
      }

      // 既存ウィンドウをフォーカス
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    app.on("activate", () => {
      // macOSでDockアイコンクリック時、ウィンドウがなければ作成
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    logger.error("Failed to initialize application", error);
    app.quit();
  });

// すべてのウィンドウが閉じられた時
app.on("window-all-closed", () => {
  // macOS以外はアプリケーションを終了
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// アプリケーション終了時にデータベース接続をクリーンアップ
// Electronはasyncイベントハンドラを待たないため、preventDefaultで終了を遅延
// app.exit() が再度 will-quit を発火するため、フラグで無限ループを防止
let isQuitting = false;
app.on("will-quit", (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();
  getOAuthManager()?.stopAutoRefresh();
  closeDb()
    .then(() => {
      logger.info("Database connection closed successfully");
    })
    .catch((error) => {
      logger.error(
        "Failed to close database during app quit",
        error instanceof Error ? error : { error },
      );
    })
    .finally(() => {
      app.exit();
    });
});
