import { spawnSync } from "node:child_process";
import { app, BrowserWindow, powerMonitor } from "electron";
import { createMainWindow } from "./window";
import { initializeDb, closeDb, getDb } from "./shared/db";
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
import { findConnectionByIdWithServer } from "./features/mcp-server-list/mcp.repository";
import { parseReauthDeepLink } from "./shared/app-protocol";
import { setupManagerIpc, fetchManagerOidcConfig } from "./ipc/manager";
import { setupProfileIpc } from "./ipc/profile";
import { setupShellIpc } from "./ipc/shell";
import {
  startAuditLogManagerSyncScheduler,
  stopAuditLogManagerSyncScheduler,
  syncPendingAuditLogsToManager,
} from "./features/audit-log-manager-sync/audit-log-manager-sync.service";
import { getAppStore } from "./shared/app-store";
import {
  activateOrganizationProfile,
  activatePersonalProfile,
} from "./shared/profile-store";
import { ServerStatus } from "@prisma/desktop-client";
import type { Prisma } from "@prisma/desktop-client";
import * as logger from "./shared/utils/logger";
import { isAddressInUseError } from "./shared/utils/error";
import { ensureNodeShim } from "./runtime/path-resolver";
import {
  OTLP_DEFAULT_PORT,
  startOtlpReceiver,
} from "./features/ai-coding-telemetry/ai-coding-telemetry.receiver";
import {
  autoReapplyMismatchedPorts,
  pruneOldTelemetry,
} from "./features/ai-coding-telemetry/ai-coding-telemetry.service";
import {
  setupAiCodingTelemetryIpc,
  setReceiverPort,
  setPendingAutoReapplied,
} from "./features/ai-coding-telemetry/ai-coding-telemetry.ipc";
import { resolveDesktopAppMode } from "./app-mode";
import {
  startAnalyticsMcpServer,
  startAnalyticsReceiverSingleton,
} from "./features/ai-coding-telemetry/ai-coding-telemetry.analytics-sidecar";

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
const appMode = resolveDesktopAppMode(process.argv);

const startAnalyticsSidecarMode = async (): Promise<void> => {
  app.dock?.hide();
  await initializeDb();

  const runtime = await startAnalyticsReceiverSingleton();

  const runTelemetryPrune = (): void => {
    void pruneOldTelemetry().catch((error: unknown) => {
      logger.error("Failed to prune old AI coding telemetry", { error });
    });
  };
  runTelemetryPrune();
  const telemetryPruneInterval = setInterval(
    runTelemetryPrune,
    24 * 60 * 60 * 1000,
  );

  let isShuttingDown = false;
  const shutdown = (): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(telemetryPruneInterval);
    const closeDbAndExit = (): void => {
      void closeDb()
        .catch((error: unknown) => {
          logger.error("Failed to close telemetry receiver DB", { error });
        })
        .finally(() => app.exit(0));
    };
    if (runtime.server) {
      runtime.server.close(closeDbAndExit);
    } else {
      closeDbAndExit();
    }
  };

  startAnalyticsMcpServer(runtime);

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.stdin.once("end", shutdown);
  app.once("will-quit", (event) => {
    if (isShuttingDown) return;
    event.preventDefault();
    shutdown();
  });
};

if (appMode === "mcp-proxy") {
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

      // upstream 認証エラー（401/403）→ needsReauth フラグを立て、AI クライアントへ
      // 再認証ディープリンクを返す（戻り値はエラーメッセージに追記される）
      const { markSecretNeedsReauth, findSecretNeedsReauthById } =
        await import("./features/oauth/oauth.repository");

      // AI 向け再認証 deeplink 入りエラーメッセージ（proactive / reactive 共通フォーマット）
      //
      // Claude Code 等は tool error を「(1) ツール結果として表示」+「(2) AI の応答」で
      // 二度表示する傾向があるため、文言は最小限にして重複時のノイズを抑える。
      // LLM 向けの指示文も含めず、ユーザーに直接見せても問題ない 1 行にとどめる
      // （Markdown リンク + 生 URL の両併記でクライアント差を吸収）。
      const buildReauthErrorMessage = (connectionId: number): string => {
        const url = `tumiki://reauth?connectionId=${connectionId}`;
        return `OAuthトークンが失効しています。再認証してください: [Tumiki Desktopで再認証](${url}) (${url})`;
      };

      // proactive な事前チェック: needsReauth=true のコネクトは upstream に投げず即拒否する。
      // フラグの判定は DB を都度参照する（GUI から再認証成功した瞬間に解除を拾えるようにするため）。
      const onBeforeToolCall = async (
        serverName: string,
      ): Promise<string | null> => {
        const connMeta = metaMap.get(serverName);
        if (!connMeta) return null;
        const flag = await findSecretNeedsReauthById(db, connMeta.secretId);
        if (flag !== true) return null;
        return buildReauthErrorMessage(connMeta.connectionId);
      };

      // reactive 経路: upstream が 401/403 を返したケースを拾う保険。
      // 既に proactive で弾かれているはずだが、refresh が走っていない / 起動直後で
      // フラグがまだ立っていない状態で発生した実 401 をフォローする。
      const onUpstreamAuthError = async (
        serverName: string,
      ): Promise<string | null> => {
        const connMeta = metaMap.get(serverName);
        if (!connMeta) return null;
        try {
          await markSecretNeedsReauth(db, connMeta.secretId);
        } catch (error) {
          process.stderr.write(
            `[tumiki-mcp-proxy] needsReauth フラグ更新に失敗: ${error instanceof Error ? error.message : String(error)}\n`,
          );
        }
        return buildReauthErrorMessage(connMeta.connectionId);
      };

      // 動的検索: --server <slug> 指定時のみ DB の McpServer.dynamicSearch を反映する。
      // 有効時は実ツール一覧を AI クライアントに直接公開せず、search/describe/execute の3メタツールだけを公開する。
      const { createDesktopToolSearchProvider } =
        await import("./features/tool-search/tool-search.service");
      const dynamicSearch =
        serverRecord?.dynamicSearch === true
          ? {
              enabled: true,
              provider: createDesktopToolSearchProvider({
                serverId: serverRecord.id,
              }),
            }
          : undefined;
      if (dynamicSearch) {
        process.stderr.write(
          `[tumiki-mcp-proxy] 動的検索が有効です (server="${serverSlug}")\n`,
        );
      }

      await mod.runMcpProxy(configs, {
        onToolCall,
        onStatusChange,
        resolveAllowedTools,
        onBeforeToolCall,
        onUpstreamAuthError,
        disableDefaultFilter,
        enableToonConversion,
        dynamicSearch,
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
} else if (appMode === "analytics") {
  void app
    .whenReady()
    .then(startAnalyticsSidecarMode)
    .catch(async (error) => {
      if (isAddressInUseError(error)) {
        logger.warn(
          "Telemetry receiver port is already in use; analytics sidecar will reuse existing receiver",
          { port: OTLP_DEFAULT_PORT },
        );
        await closeDb().catch((closeError: unknown) => {
          logger.error("Failed to close telemetry receiver DB", {
            error: closeError,
          });
        });
        process.exit(0);
      }
      logger.error("Failed to initialize telemetry receiver", error);
      await closeDb().catch((closeError: unknown) => {
        logger.error("Failed to close telemetry receiver DB", {
          error: closeError,
        });
      });
      process.exit(1);
    });
} else {
  // GUI モード: `app.ready` 前にカスタム tumiki-bundle:// スキームを privileged 登録する
  // （Electronの仕様上、registerSchemesAsPrivileged は ready 前に呼ぶ必要がある）
  registerAppProtocolSchemes();

  const PROTOCOL = "tumiki";
  const CALLBACK_HOST = "auth";
  const CALLBACK_PATHNAME = "/callback";
  // AI クライアントから「再認証してください」エラー経由で叩かれるディープリンク。
  // 例: tumiki://reauth?connectionId=42 → ToolDetail に遷移して即 OAuth ブラウザを開く
  const REAUTH_HOST = "reauth";

  // シングルインスタンスロック（Windows/Linuxでsecond-instanceイベントに必要）
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  }

  let mainWindow: BrowserWindow | null = null;
  let mcpOAuthManager: McpOAuthManager | null = null;
  // OTLP レシーバーのサーバーインスタンス（will-quit で close するため外側スコープで保持）
  let otlpHttpServer: import("http").Server | null = null;
  let telemetryPruneInterval: ReturnType<typeof setInterval> | null = null;

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
      const pendingProfile = store.get("pendingProfile") ?? "organization";
      if (pendingProfile === "personal") {
        await activatePersonalProfile();
      } else if (managerUrl) {
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
   * MCP OAuth 再認証ディープリンクの処理（tumiki://reauth?connectionId=N）
   *
   * AI クライアントが MCP プロキシ経由のツール呼び出しに失敗したとき、
   * エラー文言中の `tumiki://reauth?connectionId=N` リンクを踏むことで起動する。
   *
   * フロー:
   *   1. connectionId をパースして DB から serverId を引く（renderer へ遷移先を伝える）
   *   2. メインウィンドウを focus してアプリを前面に出す
   *   3. renderer へ navigation シグナルを送る（ToolDetail に遷移するため）
   *   4. ここで OAuth ループバック + ブラウザ起動を開始する（即 OAuth ブラウザを開く動作）
   *      成功/失敗は既存の oauth:reauthSuccess / oauth:reauthError ブロードキャストで通知される
   */
  const handleMcpReauthDeepLink = async (url: string): Promise<void> => {
    const connectionId = parseReauthDeepLink(url);
    if (connectionId === null) {
      logger.warn("Invalid MCP reauth deep link URL", { url });
      return;
    }

    ensureWindowAndFocus();

    const manager = mcpOAuthManager;
    if (!manager) {
      logger.error(
        "McpOAuthManager not initialized when handling reauth deep link",
        { connectionId },
      );
      sendToWindow(
        "oauth:reauthError",
        "再認証マネージャーが初期化されていません",
      );
      return;
    }

    // serverId を引いて renderer に「この詳細画面に飛んで」と伝える。
    // 接続が削除されている場合はユーザーへエラー通知して早期 return する
    // （後続の OAuth でも同様にエラーになるが、ユーザー向けの文言を明示するため）。
    try {
      const db = await getDb();
      const conn = await findConnectionByIdWithServer(db, connectionId);
      if (!conn) {
        sendToWindow(
          "oauth:reauthError",
          "接続情報が見つかりません。Tumiki Desktopで該当のコネクタを確認してください",
        );
        return;
      }
      sendToWindow("mcp:reauthDeeplink", {
        connectionId,
        serverId: conn.serverId,
      });
    } catch (error) {
      logger.warn(
        "Failed to resolve serverId for reauth deep link (continuing OAuth)",
        { connectionId, error },
      );
    }

    // OAuth ブラウザ起動はユーザー操作不要で即実行（推奨フロー）。
    // 失敗時は既存の broadcast に乗せて UI 側にエラー表示する。
    try {
      const result = await manager.reauthenticateConnection({ connectionId });
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send("oauth:reauthSuccess", result);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OAuth再認証に失敗しました";
      logger.error("Reauth deep link OAuth flow failed", {
        connectionId,
        error: message,
      });
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send("oauth:reauthError", message);
        }
      }
    }
  };

  /**
   * カスタムURLスキームのコールバックを処理
   *
   * - `tumiki://auth/callback` : Keycloak ログインコールバック
   * - `tumiki://reauth?connectionId=N` : AI クライアントからの MCP OAuth 再認証要求
   *
   * MCP OAuth の loopback HTTP（http://127.0.0.1:<port>/callback）はここでは扱わない。
   */
  const handleDeepLink = async (url: string): Promise<void> => {
    let action: "keycloak" | "reauth" | "unknown" = "unknown";
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== `${PROTOCOL}:`) {
        action = "unknown";
      } else if (
        parsed.hostname === CALLBACK_HOST &&
        parsed.pathname === CALLBACK_PATHNAME
      ) {
        action = "keycloak";
      } else if (parsed.hostname === REAUTH_HOST) {
        action = "reauth";
      }
    } catch {
      logger.warn("Received malformed deep link URL", { url });
      return;
    }

    if (action === "keycloak") {
      await handleKeycloakCallback(url);
      return;
    }
    if (action === "reauth") {
      await handleMcpReauthDeepLink(url);
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

      // OTLP レシーバーを起動する
      // OTLP HTTP の標準ポート 4318 を常に優先する。
      // 設定ファイルの endpoint も 4318 固定のため、競合時は random port へ逃がさず
      // 状態表示で停止として扱う。AI 起動時の tumiki-analytics MCP sidecar が既に
      // 4318 を使っている場合、GUI 側では二重起動しない。
      const receiverResult = await startOtlpReceiver(OTLP_DEFAULT_PORT, {
        allowFallback: false,
      }).catch((error: unknown) => {
        logger.error("Failed to start OTLP receiver", { error });
        return null;
      });
      const otlpPort = receiverResult?.port ?? 0;
      otlpHttpServer = receiverResult?.server ?? null;
      setReceiverPort(otlpPort);
      if (receiverResult === null) {
        logger.warn("OTLP receiver is not running in GUI process");
      }

      if (otlpHttpServer) {
        // 過去に適用したツールでポートが変わっていれば自動で再書き込みする。
        // OTLP ポートがフォールバックで変わったり、ユーザー設定で変更されても
        // 設定ファイル（~/.claude/settings.json 等）と Tumiki 受信ポートの整合性を保つ。
        const reappliedTools = await autoReapplyMismatchedPorts(otlpPort).catch(
          (error: unknown) => {
            logger.error("Failed auto re-apply of tool configs", { error });
            return [] as Awaited<ReturnType<typeof autoReapplyMismatchedPorts>>;
          },
        );
        // 再書き込みが行われた場合、ウィンドウ読み込み完了後に renderer が
        // pending IPC から取得してトースト表示する。
        if (reappliedTools.length > 0) {
          setPendingAutoReapplied(reappliedTools, otlpPort);
        }
      }
      setupAiCodingTelemetryIpc();

      // 90 日より古い AI コーディングテレメトリを削除（SQLite 肥大化防止）。
      // 起動ブロックしないよう fire-and-forget で実行し、長時間起動に備えて日次でも実行する。
      const runTelemetryPrune = (): void => {
        void pruneOldTelemetry().catch((error: unknown) => {
          logger.error("Failed to prune old AI coding telemetry", { error });
        });
      };
      runTelemetryPrune();
      telemetryPruneInterval = setInterval(
        runTelemetryPrune,
        24 * 60 * 60 * 1000,
      );

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
    if (telemetryPruneInterval) {
      clearInterval(telemetryPruneInterval);
      telemetryPruneInterval = null;
    }
    // OTLP サーバーのクローズを Promise でラップして DB クローズ前に完了を保証する
    const closeOtlpServer = (): Promise<void> =>
      new Promise((resolve) => {
        if (otlpHttpServer) otlpHttpServer.close(() => resolve());
        else resolve();
      });
    Promise.all([
      stopAuditLogManagerSyncScheduler(),
      oauthManager?.waitForPendingRefresh() ?? Promise.resolve(),
      closeOtlpServer(),
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
