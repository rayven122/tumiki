import { spawnSync } from "node:child_process";
import { app, BrowserWindow, powerMonitor } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb } from "./shared/db";
import {
  registerAppProtocolSchemes,
  handleAppProtocol,
  getRendererRoot,
} from "./shared/app-protocol";
import { setupAuthIpc } from "./ipc/auth";
import { setupCatalogIpc } from "./features/catalog/catalog.ipc";
import { setupMcpProxyLaunchCommandIpc } from "./features/mcp-proxy/launch-command.ipc";
import { setupAiClientIpc } from "./features/ai-client/ai-client.ipc";
import { setupMcpIpc } from "./features/mcp-server-list/mcp.ipc";
import { setupMcpServerDetailIpc } from "./features/mcp-server-detail/mcp-server-detail.ipc";
import { setupAuditLogIpc } from "./features/audit-log/audit-log.ipc";
import { setupDashboardIpc } from "./features/dashboard/dashboard.ipc";
import { setupDesktopSessionIpc } from "./features/desktop-session/desktop-session.ipc";
import { seedCatalogs } from "./features/catalog/catalog.seed";
import { createOAuthManager } from "./auth/oauth-manager";
import { resolveOidcEndpoints } from "./auth/oidc-client";
import { getOAuthManager, setOAuthManager } from "./auth/manager-registry";
import { getKeycloakEnvOptional } from "./utils/env";
import { createMcpOAuthManager } from "./features/oauth/oauth.service";
import { setupOAuthIpc } from "./features/oauth/oauth.ipc";
import type { McpOAuthManager } from "./features/oauth/oauth.service";
import { setupManagerIpc, fetchManagerOidcConfig } from "./ipc/manager";
import { setupProfileIpc } from "./ipc/profile";
import { setupShellIpc } from "./ipc/shell";
import {
  startAuditLogManagerSyncScheduler,
  stopAuditLogManagerSyncScheduler,
  syncPendingAuditLogsToManager,
} from "./features/audit-log-manager-sync/audit-log-manager-sync.service";
import { getAppStore } from "./shared/app-store";
import { activateOrganizationProfile } from "./shared/profile-store";
import { ServerStatus } from "@prisma/desktop-client";
import type { Prisma } from "@prisma/desktop-client";
import * as logger from "./shared/utils/logger";
import { ensureNodeShim } from "./runtime/path-resolver";

// Cursor など親プロセス（Electron アプリ）が子プロセスへ ELECTRON_RUN_AS_NODE=1 を継承
// させたケース対応。Electron が Node モードで起動すると `import { app } from "electron"` が
// undefined になり、後段の app.whenReady() で TypeError になる。
// env から ELECTRON_RUN_AS_NODE を除いて自身を Electron 主プロセスとして再起動し、
// その結果コードで終了する。親（MCPクライアント）から見れば、stdio を継承した単一の
// 長時間プロセスに見える。
//
// ⚠️ 重要: このガードより上にある import がモジュール評価時に Electron API を呼び出して
// はならない。ES Module の仕様上、import はガードより先に評価されるため、Node モードで
// 起動した瞬間にクラッシュする。新規 import 追加時は注意すること。
if (!app) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(process.execPath, process.argv.slice(1), {
    env: cleanEnv,
    stdio: "inherit",
  });
  if (result.error) {
    process.stderr.write(
      `[tumiki-desktop] Electron 再起動に失敗しました: ${result.error.message}\n`,
    );
  }
  // シグナル終了（SIGTERM 等）の場合 result.status は null になる。
  // 正常シャットダウンを exit code 1 として親に伝えると誤検知の原因になるため、
  // signal 起因なら 0、それ以外（クラッシュ）は 1 にフォールバック。
  process.exit(result.status ?? (result.signal ? 0 : 1));
}

// --mcp-proxy モード: GUI不要、stdioでMCPプロキシとして動作
const isMcpProxyMode = process.argv.includes("--mcp-proxy");

if (isMcpProxyMode) {
  // Electronのready後にDB初期化 → 設定読み込み → cli.tsのrunMcpProxyを実行
  // stdioを使うためGUI・シングルインスタンスロック等は不要
  void app.whenReady().then(async () => {
    // macOSでDockアイコンを非表示にする（CLIモードのためGUI不要）
    app.dock?.hide();

    // バンドル済みランタイムの Node shim を userData 配下に生成（DEV-1597）
    // MCPコネクタ spawn 前に必ず存在させる必要がある。失敗してもプロキシ起動は継続
    // （shim 不在時は MCP コネクタ spawn が後段でエラーになる）。
    try {
      ensureNodeShim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `[tumiki-mcp-proxy] Node shim 生成失敗（MCP起動に影響する可能性）: ${message}\n`,
      );
    }

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
      startAuditLogManagerSyncScheduler();
      powerMonitor.on("resume", () => {
        void syncPendingAuditLogsToManager();
      });

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
        await updateServerStatus(id, ServerStatus.PENDING);
      }

      // mcp-proxyのステータス（小文字）→ DBのServerStatus（大文字）マッピング
      const statusMap: Record<string, ServerStatus> = {
        running: ServerStatus.RUNNING,
        stopped: ServerStatus.STOPPED,
        error: ServerStatus.ERROR,
        pending: ServerStatus.PENDING,
      };

      // ステータス変更フック: configNameからサーバーIDを引いてDB更新
      const onStatusChange = (name: string, status: string): void => {
        const connMeta = metaMap.get(name);
        if (!connMeta) return;
        const dbStatus = statusMap[status] ?? ServerStatus.STOPPED;
        void updateServerStatus(connMeta.serverId, dbStatus);
      };

      // 監査ログフックを構築
      const onToolCall: import("@tumiki/mcp-core-proxy").ToolCallHook = (
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

        const auditLogInput = {
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
          clientName: event.clientName?.slice(0, 100),
          clientVersion: event.clientVersion?.slice(0, 50),
          // 検出があった時だけ { summary, maskedArgs } の階層構造で残す（NULL なら DB は NULL）
          // - summary: type 別の件数とマスク後トークンの集計
          // - maskedArgs: 上流 MCP に実際に渡された args 全体（生 PII を含まない）
          // Prisma Json 型へキャスト（実値は JSON シリアライズ可能なオブジェクトのみ）
          piiDetections: event.piiDetections
            ? (JSON.parse(
                JSON.stringify({
                  summary: event.piiDetections,
                  maskedArgs: event.maskedArgs ?? null,
                }),
              ) as import("@prisma/desktop-client").Prisma.InputJsonValue)
            : undefined,
          piiPolicy: event.piiPolicy,
        } satisfies Prisma.AuditLogUncheckedCreateInput;

        return writeAuditLog(auditLogInput);
      };

      const { join } = await import("path");
      const mod = (await import(join(__dirname, "mcp-cli.cjs"))) as {
        runMcpProxy: (
          configs: import("@tumiki/mcp-core-proxy").McpServerConfig[],
          hooks?: import("@tumiki/mcp-core-proxy").ProxyHooks,
        ) => Promise<void>;
      };

      // 許可ツール解決resolver（GUI のトグル変更を CLI モードに即時反映）
      // DB が0件の場合は null（フィルタ無効）を返し、起動時の挙動と整合させる。
      // 例外時は upstream-client 側で起動時設定にフォールバックされる。
      const { findToolsByConnectionId, findServerBySlug } =
        await import("./features/mcp-server-list/mcp.repository");
      const { getDb } = await import("./shared/db");
      // initializeDb() 完了後に1回だけ取得し、resolver 呼び出しごとの await を避ける
      const db = await getDb();
      const resolveAllowedTools = async (
        serverName: string,
      ): Promise<string[] | null> => {
        const connMeta = metaMap.get(serverName);
        if (!connMeta) {
          // 未登録サーバーは全許可にせず、明示的に全拒否する（安全側にフォールバック）
          process.stderr.write(
            `[tumiki-mcp-proxy] 未登録サーバー "${serverName}" の resolver をスキップ\n`,
          );
          return [];
        }
        const tools = await findToolsByConnectionId(db, connMeta.connectionId);
        if (tools.length === 0) return null;
        return tools.filter((t) => t.isAllowed).map((t) => t.name);
      };

      // PII マスキング: --server <slug> 指定時のみ DB の McpServer.isPiiMaskingEnabled を反映する。
      // --server 省略時（全サーバー集約モード）はサーバーが特定できないため、安全側でデフォルト ON のまま。
      // false 時は disableDefaultFilter=true で runMcpProxy 内のデフォルトフィルタ構築をスキップさせる。
      const serverRecord = serverSlug
        ? await findServerBySlug(db, serverSlug)
        : null;
      // slug は指定されたが DB に該当サーバーがない場合、設定ミスをログで気付けるようにする
      if (serverSlug && serverRecord === null) {
        process.stderr.write(
          `[tumiki-mcp-proxy] サーバー "${serverSlug}" が DB に見つかりません。マスキングはデフォルト ON で起動します\n`,
        );
      }
      const disableDefaultFilter =
        serverRecord !== null && !serverRecord.isPiiMaskingEnabled;
      if (disableDefaultFilter) {
        process.stderr.write(
          `[tumiki-mcp-proxy] PII マスキングは無効化されています (server="${serverSlug}")\n`,
        );
      }

      // TOON 変換: --server <slug> 指定時のみ DB の McpServer.isToonConversionEnabled を反映する。
      // ⚠️ --server 省略時（全サーバー集約モード）はサーバーが特定できないため、UI のトグルが ON でも常に OFF になる。
      // この制限は ToolDetail.tsx の圧縮トグルツールチップにも明記しているが、UI からの切替が反映されないことに注意。
      const enableToonConversion =
        serverRecord?.isToonConversionEnabled ?? false;
      if (enableToonConversion) {
        process.stderr.write(
          `[tumiki-mcp-proxy] レスポンス圧縮（TOON 変換）が有効です (server="${serverSlug}")\n`,
        );
      }

      await mod.runMcpProxy(configs, {
        onToolCall,
        onStatusChange,
        resolveAllowedTools,
        disableDefaultFilter,
        enableToonConversion,
        onShutdown: async () => {
          await stopAuditLogManagerSyncScheduler();
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
  // GUI モード: `app.ready` 前にカスタム tumiki-bundle:// スキームを privileged 登録する
  // （Electronの仕様上、registerSchemesAsPrivileged は ready 前に呼ぶ必要がある）
  registerAppProtocolSchemes();

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

  /**
   * 管理サーバーURLとOIDC設定からOAuthManagerを初期化（or 再初期化）
   */
  const initOAuthManagerFromUrl = async (
    url: string,
    issuer: string,
    clientId: string,
  ): Promise<void> => {
    const prev = getOAuthManager();
    prev?.stopAutoRefresh();

    // OIDC Discovery でプロバイダー固有のエンドポイントを取得（Dex・Keycloak・Okta 等に対応）
    const endpoints = await resolveOidcEndpoints(issuer);

    const manager = createOAuthManager(
      {
        issuer,
        clientId,
        redirectUri: `${PROTOCOL}://${CALLBACK_HOST}${CALLBACK_PATHNAME}`,
        endpoints,
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
      logger.info("OAuthManager initialized from manager URL", { url });
    } catch (error) {
      logger.error(
        "OAuthManager initialization failed (new login still available)",
        { error: error instanceof Error ? error.message : error },
      );
    }
  };

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
      const store = await getAppStore();
      const managerUrl = store.get("managerUrl");
      if (managerUrl) {
        await activateOrganizationProfile(managerUrl);
      }
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
   * カスタムURLスキームのコールバックを処理（Keycloak のみ）
   *
   * MCP OAuth は loopback HTTP（http://127.0.0.1:<port>/callback）に移行済みのため
   * ここでは扱わない。tumiki:// は Keycloak ログインコールバック専用。
   */
  const handleDeepLink = async (url: string): Promise<void> => {
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
      // dev モードでは Electron 実行パスが起動ごとに変わる可能性があるため、
      // 起動時に毎回上書き登録する（setAsDefaultProtocolClient は冪等）
      app.setAsDefaultProtocolClient(PROTOCOL);

      // バンドル済みランタイムの Node shim を userData 配下に生成（DEV-1597）
      // MCPコネクタ spawn 前に必ず存在させる必要がある。失敗しても GUI 起動は継続
      // （shim 不在時は MCP コネクタ起動のみが影響を受ける）。
      try {
        ensureNodeShim();
      } catch (error) {
        logger.error(
          "Node shim の生成に失敗しました（MCPコネクタが起動できない可能性）",
          { error: error instanceof Error ? error.message : String(error) },
        );
      }

      // production 用の tumiki-bundle:// プロトコルハンドラを登録（dev では vite dev server を使うため不要）
      // レンダラー dist の絶対パス基点で配信し、`<img src="/logos/foo.svg">` を解決可能にする
      if (!process.env["ELECTRON_RENDERER_URL"]) {
        handleAppProtocol(getRendererRoot(__dirname));
      }

      // データベース初期化
      await initializeDb();
      startAuditLogManagerSyncScheduler();

      // OAuthManager初期化: electron-store保存済みURLを優先、フォールバックで環境変数
      const savedManagerUrl = (await getAppStore()).get("managerUrl");
      if (savedManagerUrl) {
        try {
          const config = await fetchManagerOidcConfig(savedManagerUrl);
          await initOAuthManagerFromUrl(
            savedManagerUrl,
            config.issuer,
            config.clientId,
          );
        } catch (error) {
          logger.warn(
            "Saved manager URL is unreachable, OAuth disabled until reconnect",
            { error: error instanceof Error ? error.message : error },
          );
        }
      } else {
        // 後方互換: Keycloak環境変数フォールバック
        // Keycloak issuerが不到達でもアプリ起動を継続させるためtry/catchで保護
        const keycloakEnv = getKeycloakEnvOptional();
        if (keycloakEnv) {
          try {
            await initOAuthManagerFromUrl(
              "",
              keycloakEnv.KEYCLOAK_ISSUER,
              keycloakEnv.KEYCLOAK_DESKTOP_CLIENT_ID,
            );
          } catch (error) {
            logger.warn(
              "Keycloak issuer is unreachable, OAuth disabled until reconnect",
              { error: error instanceof Error ? error.message : error },
            );
          }
        } else {
          logger.warn(
            "No manager URL or Keycloak env vars configured, OAuth disabled",
          );
        }
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
      setupProfileIpc();
      setupManagerIpc(initOAuthManagerFromUrl);
      setupAuthIpc();
      setupCatalogIpc();
      setupMcpProxyLaunchCommandIpc();
      setupAiClientIpc();
      setupMcpIpc();
      setupMcpServerDetailIpc();
      setupAuditLogIpc();
      setupDashboardIpc();
      setupDesktopSessionIpc();
      setupShellIpc();

      createWindow();

      // スリープ復帰時にトークンの有効期限を再チェック
      powerMonitor.on("resume", () => {
        void syncPendingAuditLogsToManager();
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
    Promise.all([
      stopAuditLogManagerSyncScheduler(),
      oauthManager?.waitForPendingRefresh() ?? Promise.resolve(),
    ])
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
