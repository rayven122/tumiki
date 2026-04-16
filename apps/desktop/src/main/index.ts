import { app, BrowserWindow, powerMonitor } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./shared/db";
import { setupAuthIpc } from "./ipc/auth";
import { setupCatalogIpc } from "./features/catalog/catalog.ipc";
import { setupMcpIpc } from "./features/mcp-server-list/mcp.ipc";
import { setupMcpServerDetailIpc } from "./features/mcp-server-detail/mcp-server-detail.ipc";
import { setupAuditLogIpc } from "./features/audit-log/audit-log.ipc";
import { seedCatalogs } from "./features/catalog/catalog.seed";
import { createOAuthManager } from "./auth/oauth-manager";
import { getOAuthManager, setOAuthManager } from "./auth/manager-registry";
import { getKeycloakEnvOptional } from "./utils/env";
import { createMcpOAuthManager } from "./features/oauth/oauth.service";
import { setupOAuthIpc } from "./features/oauth/oauth.ipc";
import { isMcpOAuthCallback } from "./features/oauth/oauth.protocol";
import type { McpOAuthManager } from "./features/oauth/oauth.service";
import * as logger from "./shared/utils/logger";

// --mcp-proxy モード: GUI不要、stdioでMCPプロキシとして動作
const isMcpProxyMode = process.argv.includes("--mcp-proxy");

if (isMcpProxyMode) {
  // Electronのready後にDB初期化 → 設定読み込み → cli.tsのrunMcpProxyを実行
  // stdioを使うためGUI・シングルインスタンスロック等は不要
  void app.whenReady().then(async () => {
    // macOSでDockアイコンを非表示にする（CLIモードのためGUI不要）
    app.dock?.hide();

    try {
      // --server <slug> で起動する仮想MCPサーバーを指定（省略時は全有効サーバー）
      const serverIdx = process.argv.indexOf("--server");
      const serverSlug =
        serverIdx !== -1 && serverIdx + 1 < process.argv.length
          ? process.argv[serverIdx + 1]
          : undefined;

      // DB初期化
      await initializeDb();

      // 古い監査ログを自動削除（7日以上）— 失敗してもプロキシ起動は継続
      const { deleteOldAuditLogs, writeAuditLog } =
        await import("./features/audit-log/audit-log.writer");
      try {
        const deletedCount = await deleteOldAuditLogs();
        if (deletedCount > 0) {
          process.stderr.write(
            `[tumiki-mcp-proxy] ${deletedCount}件の古い監査ログを削除しました\n`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(
          `[tumiki-mcp-proxy] 古い監査ログの削除に失敗しました（起動は継続します）: ${message}\n`,
        );
      }

      // 有効なMCPサーバー設定 + 監査ログ用メタデータを取得
      const { getEnabledConfigsWithMeta } =
        await import("./features/mcp-proxy/mcp-proxy.service");
      const { updateServerStatus, resetAllServerStatus } =
        await import("./features/mcp-server-list/mcp.service");
      const { configs, meta } = await getEnabledConfigsWithMeta(serverSlug);

      // configName → メタデータのルックアップマップを構築
      const metaMap = new Map(meta.map((m) => [m.configName, m]));

      // 対象サーバーをPENDINGに更新（起動前の状態表示）
      const serverIds = new Set(meta.map((m) => m.serverId));
      for (const id of serverIds) {
        await updateServerStatus(id, "PENDING");
      }

      // mcp-proxyのステータス（小文字）→ DBのServerStatus（大文字）マッピング
      const statusMap: Record<string, "RUNNING" | "STOPPED" | "ERROR" | "PENDING"> = {
        running: "RUNNING",
        stopped: "STOPPED",
        error: "ERROR",
        pending: "PENDING",
      };

      // ステータス変更フック: configNameからサーバーIDを引いてDB更新
      const onStatusChange = (name: string, status: string): void => {
          const connMeta = metaMap.get(name);
          if (!connMeta) return;
          const dbStatus = statusMap[status] ?? "STOPPED";
          void updateServerStatus(connMeta.serverId, dbStatus);
        };

      // 監査ログフックを構築
      const onToolCall: import("@tumiki/mcp-proxy-core").ToolCallHook = (
        event,
      ) => {
        const sepIdx = event.prefixedToolName.indexOf("__");
        const configName =
          sepIdx !== -1
            ? event.prefixedToolName.slice(0, sepIdx)
            : event.prefixedToolName;
        const toolName =
          sepIdx !== -1
            ? event.prefixedToolName.slice(sepIdx + 2)
            : event.prefixedToolName;
        const connMeta = metaMap.get(configName);
        if (!connMeta) {
          process.stderr.write(
            `[tumiki-mcp-proxy] 監査ログスキップ: configName="${configName}" がメタマップに存在しません\n`,
          );
          return;
        }

        const safeByteLength = (value: unknown): number => {
          try {
            return new TextEncoder().encode(JSON.stringify(value)).length;
          } catch {
            return 0;
          }
        };
        const inputBytes = safeByteLength(event.args);
        const outputBytes = safeByteLength(event.resultContent);

        return writeAuditLog({
          toolName,
          method: "tools/call",
          transportType: connMeta.transportType,
          durationMs: event.durationMs,
          inputBytes,
          outputBytes,
          isSuccess: event.isSuccess,
          errorSummary: event.errorMessage?.slice(0, 500),
          serverId: connMeta.serverId,
          connectionName: connMeta.connectionName,
        });
      };

      const { join } = await import("path");
      const mod = (await import(join(__dirname, "mcp-cli.cjs"))) as {
        runMcpProxy: (
          configs: import("@tumiki/mcp-proxy-core").McpServerConfig[],
          hooks?: import("@tumiki/mcp-proxy-core").ProxyHooks,
        ) => Promise<void>;
      };
      await mod.runMcpProxy(configs, {
        onToolCall,
        onStatusChange,
        onShutdown: async () => {
          await resetAllServerStatus().catch(() => {});
          await closeDb();
        },
      });
    } catch (error) {
      // CLIモードではstdoutはMCPプロトコル専用のため、stderrに出す
      // Claude Code側のログから原因にたどり着けるようエラー詳細を明記
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      process.stderr.write(
        `[tumiki-mcp-proxy] 起動に失敗しました: ${message}\n`,
      );
      if (stack) {
        process.stderr.write(`${stack}\n`);
      }
      process.exit(1);
    }
  });
} else {
  const PROTOCOL = "tumiki";
  const CALLBACK_HOST = "auth";
  const CALLBACK_PATHNAME = "/callback";

  // シングルインスタンスロック（Windows/Linuxでsecond-instanceイベントに必要）
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  }

  let mainWindow: BrowserWindow | null = null;
  let mcpOAuthManager: McpOAuthManager | null = null;

  const createWindow = (): void => {
    mainWindow = createMainWindow();

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  };

  /**
   * ウィンドウにIPCメッセージを送信（ロード完了を待機）
   */
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

  /**
   * ウィンドウを確保してフォーカスする
   */
  const ensureWindowAndFocus = (): void => {
    if (!mainWindow) {
      logger.info(
        "mainWindow is null during deep link callback, creating window",
      );
      createWindow();
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  };

  /**
   * Keycloak認証コールバックを処理（tumiki://auth/callback）
   */
  const handleKeycloakCallback = async (url: string): Promise<void> => {
    ensureWindowAndFocus();

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
        error instanceof Error
          ? error.message
          : "認証コールバックに失敗しました";
      sendToWindow("auth:callbackError", message);
      logger.error("Deep link auth callback failed", { error });
    }
  };

  /**
   * MCP OAuthコールバックを処理（tumiki://oauth/callback）
   */
  const handleMcpOAuthCallback = async (url: string): Promise<void> => {
    ensureWindowAndFocus();

    if (!mcpOAuthManager) {
      logger.error("McpOAuthManager not initialized when handling callback");
      sendToWindow(
        "oauth:error",
        "OAuth認証マネージャーが初期化されていません",
      );
      return;
    }

    try {
      const result = await mcpOAuthManager.handleCallback(url);
      sendToWindow("oauth:success", result);
      logger.info("MCP OAuth callback handled successfully", {
        serverId: result.serverId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OAuth認証に失敗しました";
      sendToWindow("oauth:error", message);
      logger.error("MCP OAuth callback failed", { error });
    }
  };

  /**
   * カスタムURLスキームのコールバックを処理（ルーティング）
   */
  const handleDeepLink = async (url: string): Promise<void> => {
    // MCP OAuthコールバック（tumiki://oauth/callback）
    if (isMcpOAuthCallback(url)) {
      await handleMcpOAuthCallback(url);
      return;
    }

    // Keycloak認証コールバック（tumiki://auth/callback）
    let isKeycloakCallback = false;
    try {
      const parsed = new URL(url);
      isKeycloakCallback =
        parsed.protocol === `${PROTOCOL}:` &&
        parsed.hostname === CALLBACK_HOST &&
        parsed.pathname === CALLBACK_PATHNAME;
    } catch {
      logger.warn("Received malformed deep link URL", { url });
      return;
    }

    if (isKeycloakCallback) {
      await handleKeycloakCallback(url);
      return;
    }

    logger.warn("Received unknown deep link", { url });
  };

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
    // argv末尾にURLが含まれる（Keycloak or MCP OAuthいずれか）
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

      // MCP OAuthマネージャー初期化
      mcpOAuthManager = createMcpOAuthManager();
      setupOAuthIpc(mcpOAuthManager);

      // IPC ハンドラー登録
      setupAuthIpc();
      setupCatalogIpc();
      setupMcpIpc();
      setupMcpServerDetailIpc();
      setupAuditLogIpc();

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
    (oauthManager?.waitForPendingRefresh() ?? Promise.resolve())
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
} // if (isMcpProxyMode)
