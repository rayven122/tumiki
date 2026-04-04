/**
 * MCP Proxy Process の fork 管理 + 通信
 */
import { fork, type ChildProcess } from "child_process";
import { join } from "path";
import { randomUUID } from "crypto";
import * as logger from "../shared/utils/logger";
import type {
  ProxyRequest,
  ProxyResponse,
  ProxyEvent,
  McpServerState,
  McpToolInfo,
  CallToolResult,
  CallToolPayload,
} from "@tumiki/mcp-proxy-core";

// リトライ設定（Proxy Processクラッシュ時）
const MAX_PROCESS_RETRIES = 3;
const PROCESS_RETRY_BASE_DELAY_MS = 1000;
const PROCESS_RETRY_MULTIPLIER = 3;

// リクエストタイムアウト（30秒）
const REQUEST_TIMEOUT_MS = 30_000;

let proxyProcess: ChildProcess | null = null;
let pendingRequests = new Map<
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

/**
 * Proxy Processにリクエストを送信し、レスポンスを待つ
 */
const sendRequest = (
  type: ProxyRequest["type"],
  payload?: CallToolPayload,
): Promise<ProxyResponse> => {
  return new Promise((resolve, reject) => {
    if (!proxyProcess) {
      reject(new Error("Proxy Processが起動していません"));
      return;
    }

    const id = randomUUID();
    const request = (
      type === "call-tool"
        ? { id, type, payload: payload as CallToolPayload }
        : { id, type }
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
  if ("type" in record && record.type === "status-changed") {
    const event = msg as ProxyEvent;
    logger.info("MCPサーバー状態変更", {
      name: event.payload.name,
      status: event.payload.status,
      error: event.payload.error,
    });
    return;
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
  pendingRequests = new Map();

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
      .then(() => sendRequest("start"))
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

    // NOTE: detached: true はUnix専用。Windowsでは process.kill(-pid) が動作しない
    // Windows対応が必要な場合はプラットフォーム分岐を追加すること
    proxyProcess = fork(processPath, [], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      detached: true,
    });

    proxyProcess.on("message", handleMessage);

    proxyProcess.on("exit", (code, signal) => {
      // 世代が異なる（新しい spawnProxy が呼ばれた後の古いプロセス）場合は無視
      if (generation !== processGeneration) return;
      logger.warn("Proxy Processが終了しました", { code, signal });
      handleProcessCrash();
    });

    proxyProcess.on("error", (error) => {
      logger.error("Proxy Processでエラーが発生しました", error);
    });

    // stderr出力をログに転送
    proxyProcess.stderr?.on("data", (data: Buffer) => {
      logger.debug(`[proxy] ${data.toString().trim()}`);
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
 */
export const startMcpServers = async (): Promise<McpServerState[]> => {
  if (!proxyProcess) {
    await spawnProxy();
  }

  const response = await sendRequest("start");
  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.result as McpServerState[];
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

  return response.result as McpToolInfo[];
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

  return response.result as CallToolResult;
};

/**
 * MCPサーバーの状態を取得（IPC経由）
 */
export const getMcpStatus = async (): Promise<McpServerState[]> => {
  if (!proxyProcess) {
    throw new Error("Proxy Processが起動していません");
  }

  const response = await sendRequest("status");
  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.result as McpServerState[];
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
    await stopMcpServers();
  } catch (error) {
    logger.warn("MCPサーバーの正常停止に失敗、強制終了します", {
      error: error instanceof Error ? error.message : error,
    });
  }

  // detached: true で起動しているため、プロセスグループごと���了
  // -pid でグループ内の全子プロセス（Serena等）も確実に終了させる
  if (proxyProcess.pid) {
    try {
      process.kill(-proxyProcess.pid, "SIGTERM");
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
          process.kill(-proxyProcess.pid, "SIGKILL");
        } catch (killError) {
          if ((killError as NodeJS.ErrnoException).code !== "ESRCH") {
            logger.error("プロセスグループのSIGKILLにも失敗しました", {
              error:
                killError instanceof Error
                  ? killError.message
                  : String(killError),
            });
          }
          // 最終手段: 直接プロセスのみkill
          proxyProcess.kill("SIGKILL");
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
  pendingRequests = new Map();
  processRetryCount = 0;

  logger.info("Proxy Processを停止しました");
};
