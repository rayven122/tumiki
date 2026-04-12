/**
 * MCP Proxy Process の fork 管理 + 通信
 */
import { fork, type ChildProcess } from "child_process";
import { join } from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import * as logger from "../../shared/utils/logger";
import type {
  ProxyRequest,
  ProxyResponse,
  ProxyEvent,
  McpServerState,
  McpToolInfo,
  CallToolResult,
  CallToolPayload,
  McpServerConfig,
} from "@tumiki/mcp-proxy-core";
import { getEnabledConfigs } from "../mcp-server-list/mcp.service";
import * as auditLogService from "../audit-log/audit-log.service";

// tool-calledイベントペイロードのバリデーション
const toolCalledPayloadSchema = z.object({
  prefixedToolName: z.string(),
  durationMs: z.number().int().nonnegative(),
  inputBytes: z.number().int().nonnegative(),
  outputBytes: z.number().int().nonnegative(),
  isSuccess: z.boolean(),
  errorMessage: z.string().nullable(),
});

// IPC戻り値のzodスキーマ
const mcpToolInfoSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.unknown(),
  serverName: z.string().optional(),
});

const mcpServerStateSchema = z.object({
  name: z.string(),
  status: z.enum(["running", "stopped", "error", "pending"]),
  error: z.string().optional(),
  tools: z.array(mcpToolInfoSchema),
});

const callToolResultSchema = z.object({
  content: z.array(z.unknown()),
  isError: z.boolean().optional(),
});

// リトライ設定（Proxy Processクラッシュ時）
const MAX_PROCESS_RETRIES = 3;
const PROCESS_RETRY_BASE_DELAY_MS = 1000;
const PROCESS_RETRY_MULTIPLIER = 3;

// リクエストタイムアウト（30秒）
const REQUEST_TIMEOUT_MS = 30_000;

// シャットダウン時のタイムアウト（3秒）
const SHUTDOWN_TIMEOUT_MS = 3_000;

// TODO: 本番化時にファクトリ関数パターンに変更し、テスタビリティを改善する（DEV-1450）
let proxyProcess: ChildProcess | null = null;
const pendingRequests = new Map<
  string,
  { resolve: (value: ProxyResponse) => void; reject: (error: Error) => void }
>();
let processRetryCount = 0;
let processRetryTimer: ReturnType<typeof setTimeout> | null = null;
// 意図的な停止中はクラッシュリトライを抑制
let intentionalStop = false;
// spawnProxy の並列呼び出し防止用 Promise キャッシュ
let spawnPromise: Promise<void> | null = null;
// spawnProxy の世代管理（stale な exit イベントを無視するため）
let processGeneration = 0;
// exit/error イベントの二重発火によるcrash処理の多重実行を防止
let crashHandled = false;

/**
 * Proxy Processにリクエストを送信し、レスポンスを待つ
 * start/call-toolリクエスト時はpayloadを必須にする
 */
const sendRequest: {
  (
    type: "start",
    payload: { configs: McpServerConfig[] },
  ): Promise<ProxyResponse>;
  (type: "call-tool", payload: CallToolPayload): Promise<ProxyResponse>;
  (
    type: Exclude<ProxyRequest["type"], "start" | "call-tool">,
  ): Promise<ProxyResponse>;
} = (type: ProxyRequest["type"], payload?: unknown): Promise<ProxyResponse> => {
  return new Promise((resolve, reject) => {
    if (!proxyProcess) {
      reject(new Error("Proxy Processが起動していません"));
      return;
    }

    const id = randomUUID();
    const request = (
      payload ? { id, type, payload } : { id, type }
    ) as ProxyRequest;

    const timer = setTimeout(() => {
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        pending.reject(
          new Error(`リクエスト "${type}" がタイムアウトしました`),
        );
      }
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    try {
      proxyProcess.send(request);
    } catch (error) {
      pendingRequests.delete(id);
      clearTimeout(timer);
      reject(
        new Error(
          `IPCメッセージの送信に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        ),
      );
    }
  });
};

/**
 * Proxy Processからのメッセージを処理
 * レスポンスはidフィールドを持ち、イベントは持たないことで判別する
 */
const handleMessage = (msg: unknown): void => {
  if (typeof msg !== "object" || msg === null) {
    logger.warn("Proxy Processから不正なメッセージを受信しました", { msg });
    return;
  }

  const record = msg as Record<string, unknown>;

  // ProxyResponseの判別: idフィールドを持つメッセージはレスポンス
  if ("id" in record && typeof record.id === "string") {
    const response = msg as ProxyResponse;
    const pending = pendingRequests.get(response.id);
    if (pending) {
      pendingRequests.delete(response.id);
      pending.resolve(response);
    } else {
      logger.debug(
        "対応するリクエストがないレスポンスを受信（タイムアウト済みの可能性）",
        { id: response.id },
      );
    }
    return;
  }

  // ProxyEventの判別: typeフィールドを持つメッセージはイベント
  if ("type" in record && typeof record.type === "string") {
    const event = msg as ProxyEvent;
    switch (event.type) {
      case "status-changed":
        logger.info("MCPサーバー状態変更", {
          name: event.payload.name,
          status: event.payload.status,
          error: event.payload.error,
        });
        return;
      case "tool-called": {
        const parsed = toolCalledPayloadSchema.safeParse(
          (record as { payload?: unknown }).payload,
        );
        if (!parsed.success) {
          logger.warn("tool-called ペイロードが不正です", { msg });
          return;
        }
        void auditLogService.recordMcpToolCall(parsed.data);
        return;
      }
    }
  }

  logger.warn("Proxy Processから未分類のメッセージを受信しました", { msg });
};

/**
 * Proxy Processのクラッシュ時リトライ
 */
const handleProcessCrash = (): void => {
  proxyProcess = null;

  // 意図的な停止時はリトライしない
  if (intentionalStop) return;

  // 保留中のリクエストを全てエラーにする
  for (const [, pending] of pendingRequests) {
    pending.reject(new Error("Proxy Processがクラッシュしました"));
  }
  pendingRequests.clear();

  if (processRetryCount >= MAX_PROCESS_RETRIES) {
    logger.error(
      `Proxy Processのリトライ上限（${MAX_PROCESS_RETRIES}回）に達しました`,
    );
    return;
  }

  processRetryCount++;
  const delay =
    PROCESS_RETRY_BASE_DELAY_MS *
    Math.pow(PROCESS_RETRY_MULTIPLIER, processRetryCount - 1);
  logger.info(
    `Proxy Processを${delay}ms後にリトライします（${processRetryCount}/${MAX_PROCESS_RETRIES}）`,
  );

  processRetryTimer = setTimeout(() => {
    processRetryTimer = null;
    // プロセス再起動後にMCPサーバーへの再接続も行う
    void spawnProxy()
      .then(() => startMcpServers())
      .catch((error) => {
        logger.error("Proxy Process再起動後のMCPサーバー再接続に失敗しました", {
          error: error instanceof Error ? error.message : error,
        });
      });
  }, delay);
};

/**
 * Proxy Processを起動
 * 並列呼び出し時は既存の Promise を返して二重起動を防止する
 */
const spawnProxy = async (): Promise<void> => {
  // 既に起動中なら既存の Promise を返す（並列呼び出し防止）
  if (spawnPromise) return spawnPromise;

  const doSpawn = async (): Promise<void> => {
    // 再起動時にクラッシュリトライを有効化
    intentionalStop = false;

    // 既存のリトライタイマーをキャンセル
    if (processRetryTimer) {
      clearTimeout(processRetryTimer);
      processRetryTimer = null;
    }

    // process.ts のビルド成果物パスを解決
    // electron-viteビルド時: dist-electron/main/mcp-process.cjs
    // 開発時: 同じディレクトリ
    const processPath = join(__dirname, "mcp-process.cjs");

    const generation = ++processGeneration;
    crashHandled = false;

    // Windowsでは detached: true が新しいコンソールウィンドウを作成し、
    // process.kill(-pid) が動作しないため、プラットフォームで分岐する
    const isWindows = process.platform === "win32";
    proxyProcess = fork(processPath, [], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      detached: !isWindows,
    });

    proxyProcess.on("message", handleMessage);

    proxyProcess.on("exit", (code, signal) => {
      // 世代が異なる（新しい spawnProxy が呼ばれた後の古いプロセス）場合は無視
      if (generation !== processGeneration) return;
      if (crashHandled) return;
      crashHandled = true;
      logger.warn("Proxy Processが終了しました", { code, signal });
      handleProcessCrash();
    });

    proxyProcess.on("error", (error) => {
      logger.error("Proxy Processでエラーが発生しました", error);
      // fork()パス不正等でexitイベントが発火しないケースに備えてリカバリ
      if (generation === processGeneration && !crashHandled) {
        crashHandled = true;
        handleProcessCrash();
      }
    });

    // stderr出力をログに転送
    proxyProcess.stderr?.on("data", (data: Buffer) => {
      logger.debug(`[proxy] ${data.toString().trim()}`);
    });

    // プロセスが正常に起動したことを確認（fork失敗時は即座にエラーを返す）
    const proc = proxyProcess;
    if (!proc) throw new Error("プロセスの起動に失敗しました");
    await new Promise<void>((resolve, reject) => {
      const onSpawn = (): void => {
        cleanup();
        resolve();
      };
      const onError = (err: Error): void => {
        cleanup();
        reject(err);
      };
      const cleanup = (): void => {
        proc.removeListener("spawn", onSpawn);
        proc.removeListener("error", onError);
      };
      proc.once("spawn", onSpawn);
      proc.once("error", onError);
    });

    processRetryCount = 0;
    logger.info("Proxy Processを起動しました");
  };

  spawnPromise = doSpawn().finally(() => {
    spawnPromise = null;
  });
  return spawnPromise;
};

/**
 * MCPサーバーを起動（IPC経由）
 * DBから有効な接続設定を読み込み、Proxy Processに渡す
 */
export const startMcpServers = async (): Promise<McpServerState[]> => {
  if (!proxyProcess) {
    await spawnProxy();
  }

  const configs = await getEnabledConfigs();
  const response = await sendRequest("start", { configs });
  if (!response.ok) {
    throw new Error(response.error);
  }

  const parsed = z.array(mcpServerStateSchema).safeParse(response.result);
  if (!parsed.success) {
    throw new Error(`不正なレスポンス形式: ${parsed.error.message}`);
  }
  return parsed.data;
};

/**
 * MCPサーバーを停止（IPC経由）
 */
export const stopMcpServers = async (): Promise<void> => {
  if (!proxyProcess) return;

  const response = await sendRequest("stop");
  if (!response.ok) {
    throw new Error(response.error);
  }
};

/**
 * ツール一覧を取得（IPC経由）
 */
export const listMcpTools = async (): Promise<McpToolInfo[]> => {
  if (!proxyProcess) {
    throw new Error("Proxy Processが起動していません");
  }

  const response = await sendRequest("list-tools");
  if (!response.ok) {
    throw new Error(response.error);
  }

  const parsed = z.array(mcpToolInfoSchema).safeParse(response.result);
  if (!parsed.success) {
    throw new Error(`不正なレスポンス形式: ${parsed.error.message}`);
  }
  return parsed.data;
};

/**
 * ツールを実行（IPC経由）
 */
export const callMcpTool = async (
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> => {
  if (!proxyProcess) {
    throw new Error("Proxy Processが起動していません");
  }

  const response = await sendRequest("call-tool", { name, arguments: args });
  if (!response.ok) {
    throw new Error(response.error);
  }

  const parsed = callToolResultSchema.safeParse(response.result);
  if (!parsed.success) {
    throw new Error(`不正なレスポンス形式: ${parsed.error.message}`);
  }
  return parsed.data;
};

/**
 * MCPサーバーの状態を取得（IPC経由）
 */
export const getMcpStatus = async (): Promise<McpServerState[]> => {
  // Proxy未起動時はUIポーリングを考慮して空配列を返す（startMcpServersと異なり自動起動しない）
  if (!proxyProcess) {
    return [];
  }

  const response = await sendRequest("status");
  if (!response.ok) {
    throw new Error(response.error);
  }

  const parsed = z.array(mcpServerStateSchema).safeParse(response.result);
  if (!parsed.success) {
    throw new Error(`不正なレスポンス形式: ${parsed.error.message}`);
  }
  return parsed.data;
};

/**
 * Proxy Processを停止（アプリ終了時）
 */
export const stopProxy = async (): Promise<void> => {
  intentionalStop = true;

  if (processRetryTimer) {
    clearTimeout(processRetryTimer);
    processRetryTimer = null;
  }

  if (!proxyProcess) return;

  try {
    // シャットダウン時は短いタイムアウトでMCPサーバーの正常停止を試みる
    // REQUEST_TIMEOUT_MS（30秒）だとアプリ終了が長時間ハングする可能性がある
    await Promise.race([
      sendRequest("stop"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("シャットダウンタイムアウト")),
          SHUTDOWN_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (error) {
    logger.warn("MCPサーバーの正常停止に失敗、強制終了します", {
      error: error instanceof Error ? error.message : error,
    });
  }

  // detached: true で起動しているため、プロセスグループごと終了
  // -pid でグループ内の全子プロセス（Serena等）も確実に終了させる
  const isWindows = process.platform === "win32";
  if (proxyProcess.pid) {
    try {
      if (isWindows) {
        proxyProcess.kill("SIGTERM");
      } else {
        process.kill(-proxyProcess.pid, "SIGTERM");
      }
    } catch (error) {
      const code =
        error instanceof Error && "code" in error
          ? (error as NodeJS.ErrnoException).code
          : undefined;
      if (code !== "ESRCH") {
        // SIGTERM失敗時はSIGKILLにエスカレーション
        logger.warn("プロセスグループのSIGTERMに失敗、SIGKILLを試行します", {
          error: error instanceof Error ? error.message : String(error),
        });
        try {
          if (isWindows) {
            proxyProcess.kill("SIGKILL");
          } else {
            process.kill(-proxyProcess.pid, "SIGKILL");
          }
        } catch (killError) {
          const killErrCode =
            killError instanceof Error
              ? (killError as NodeJS.ErrnoException).code
              : undefined;
          if (killErrCode !== "ESRCH") {
            logger.error("プロセスグループのSIGKILLにも失敗しました", {
              error:
                killError instanceof Error
                  ? killError.message
                  : String(killError),
            });
          }
          // 最終手段: 直接プロセスのみkill（既に終了済みの場合もあるためtry-catch）
          try {
            proxyProcess.kill("SIGKILL");
          } catch (finalError) {
            logger.warn(
              "直接プロセスのSIGKILLも失敗しました（既に終了済みの可能性）",
              {
                error:
                  finalError instanceof Error
                    ? finalError.message
                    : String(finalError),
              },
            );
          }
        }
      }
    }
  } else {
    proxyProcess.kill();
  }
  proxyProcess = null;

  // 保留中のリクエストを全てエラーにしてからクリア
  for (const [, pending] of pendingRequests) {
    pending.reject(new Error("Proxy Processが停止されました"));
  }
  pendingRequests.clear();
  processRetryCount = 0;

  logger.info("Proxy Processを停止しました");
};
