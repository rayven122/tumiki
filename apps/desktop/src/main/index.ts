import { app, BrowserWindow, powerMonitor } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./shared/db";
import { setupAuthIpc } from "./ipc/auth";
import { setupCatalogIpc } from "./features/catalog/catalog.ipc";
import { setupMcpIpc } from "./features/mcp/mcp.ipc";
import { setupMcpIpc as setupMcpProxyIpc } from "./mcp/mcp.ipc";
import { stopProxy } from "./mcp/mcp.service";
import { seedCatalogs } from "./features/catalog/catalog.seed";
import { createOAuthManager } from "./auth/oauth-manager";
import { getOAuthManager, setOAuthManager } from "./auth/manager-registry";
import { getKeycloakEnvOptional } from "./utils/env";
import * as logger from "./shared/utils/logger";

// --mcp-proxy モード: GUI不要、stdioでMCPプロキシとして動作
// 実際のプロキシ処理は mcp-cli.cjs（cli.ts の独立ビルドエントリーポイント）で実行
const isMcpProxyMode = process.argv.includes("--mcp-proxy");

const PROTOCOL = "tumiki-desktop";
const CALLBACK_HOST = "auth";
const CALLBACK_PATHNAME = "/callback";

// シングルインスタンスロック（Windows/Linuxでsecond-instanceイベントに必要）
// --mcp-proxyモードではGUI不要のためスキップ
if (!isMcpProxyMode) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  }
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
  let isValidCallback = false;
  try {
    const parsed = new URL(url);
    isValidCallback =
      parsed.protocol === `${PROTOCOL}:` &&
      parsed.hostname === CALLBACK_HOST &&
      parsed.pathname === CALLBACK_PATHNAME;
  } catch {
    logger.warn("Received malformed deep link URL", { url });
    return;
  }
  if (!isValidCallback) {
    logger.warn("Received unknown deep link", { url });
    return;
  }

  // ウィンドウが閉じられていた場合は再作成（コールバックがサイレントに失われるのを防止）
  if (!mainWindow) {
    logger.info(
      "mainWindow is null during deep link callback, creating window",
    );
    createWindow();
  }

  // ロード完了を待ってからIPCを送信（ウィンドウ再作成直後はロード中の場合がある）
  const sendToWindow = (channel: string, ...args: unknown[]): void => {
    if (!mainWindow) return;
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once("did-finish-load", () => {
        mainWindow?.webContents.send(channel, ...args);
      });
    } else {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  const manager = getOAuthManager();
  if (!manager) {
    logger.error("OAuthManager not initialized when handling deep link");
    sendToWindow(
      "auth:callbackError",
      "認証マネージャーが初期化されていません",
    );
    return;
  }

  try {
    await manager.handleAuthCallback(url);
    sendToWindow("auth:callbackSuccess");
    logger.info("Deep link auth callback handled successfully");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "認証コールバックに失敗しました";
    sendToWindow("auth:callbackError", message);
    logger.error("Deep link auth callback failed", { error });
  }

  // コールバック後にウィンドウをフォーカス
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
};

// --mcp-proxyモードではGUI関連イベント登録をスキップ
if (!isMcpProxyMode) {
  // macOS: アプリが既に起動している場合のディープリンク処理
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url).catch((error) => {
      logger.error("Unhandled error in open-url handler", { error });
    });
  });

  // Windows/Linux: second-instanceイベントでディープリンクを処理
  // Electronの仕様上、readyイベント前に登録する必要がある
  app.on("second-instance", (_event, argv) => {
    // argv末尾にURLが含まれる
    const deepLinkUrl = argv.find((arg) => {
      try {
        return new URL(arg).protocol === `${PROTOCOL}:`;
      } catch {
        return false;
      }
    });
    if (deepLinkUrl) {
      // handleDeepLink内でウィンドウフォーカスも行うため、ここでは不要
      handleDeepLink(deepLinkUrl).catch((error) => {
        logger.error("Unhandled error in second-instance handler", { error });
      });
    } else {
      // ディープリンクなしの場合のみ、既存ウィンドウをフォーカス
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  });

  // アプリケーション準備完了時
  app
    .whenReady()
    .then(async () => {
      // カスタムURLスキームを登録（Linuxではready後に呼ぶ必要がある）
      if (!app.isDefaultProtocolClient(PROTOCOL)) {
        app.setAsDefaultProtocolClient(PROTOCOL);
      }

      // データベース初期化
      await initializeDb();

      // OAuthManager初期化（環境変数が設定されている場合のみ）
      const keycloakEnv = getKeycloakEnvOptional();
      if (keycloakEnv) {
        const manager = createOAuthManager(
          {
            issuer: keycloakEnv.KEYCLOAK_ISSUER,
            clientId: keycloakEnv.KEYCLOAK_DESKTOP_CLIENT_ID,
            redirectUri: `${PROTOCOL}://${CALLBACK_HOST}${CALLBACK_PATHNAME}`,
          },
          {
            onAuthExpired: () => {
              mainWindow?.webContents.send(
                "auth:sessionExpired",
                "認証セッションの有効期限が切れました。再度ログインしてください。",
              );
            },
          },
        );
        setOAuthManager(manager);
        try {
          await manager.initialize();
          logger.info("OAuthManager initialized");
        } catch (error) {
          // 既存トークンの復元に失敗しても、新規ログインフローは利用可能なためマネージャーは維持
          logger.error(
            "OAuthManager initialization failed (new login still available)",
            {
              error: error instanceof Error ? error.message : error,
            },
          );
        }
      } else {
        logger.warn("Keycloak environment variables not set, OAuth disabled");
      }

      // カタログ初期データを投入（冪等・失敗してもアプリ起動は継続）
      try {
        await seedCatalogs();
      } catch (error) {
        logger.error(
          "Failed to seed catalogs (non-critical, continuing startup)",
          {
            error: error instanceof Error ? error.message : error,
          },
        );
      }

      // IPC ハンドラー登録
      setupAuthIpc();
      setupCatalogIpc();
      setupMcpIpc();
      setupMcpProxyIpc();

      createWindow();

      // スリープ復帰時にトークンの有効期限を再チェック
      powerMonitor.on("resume", () => {
        const manager = getOAuthManager();
        if (manager) {
          manager.initialize().catch((error) => {
            logger.error("Failed to re-initialize OAuth after resume", {
              error,
            });
            mainWindow?.webContents.send(
              "auth:sessionExpired",
              "スリープ復帰後の認証状態の復元に失敗しました",
            );
          });
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
    const oauthManager = getOAuthManager();
    oauthManager?.stopAutoRefresh();
    stopProxy()
      .then(() => oauthManager?.waitForPendingRefresh() ?? Promise.resolve())
      .then(() => closeDb())
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
} // if (!isMcpProxyMode)
