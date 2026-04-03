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
} from "./types";

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

/**
 * Proxy Processにリクエストを送信し、レスポンスを待つ
 */
const sendRequest = (
  type: ProxyRequest["type"],
  payload?: unknown,
): Promise<ProxyResponse> => {
  return new Promise((resolve, reject) => {
    if (!proxyProcess) {
      reject(new Error("Proxy Processが起動していません"));
      return;
    }

    const id = randomUUID();
    const request: ProxyRequest = { id, type, payload };

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
    proxyProcess.send(request);
  });
};

/**
 * Proxy Processからのメッセージを処理
 */
const handleMessage = (msg: unknown): void => {
  if (typeof msg !== "object" || msg === null) {
    logger.warn("Proxy Processから不正なメッセージを受信しました", { msg });
    return;
  }

  const message = msg as ProxyResponse | ProxyEvent;

  // ProxyEventの場合
  if ("type" in message && message.type === "status-changed") {
    const event = message as ProxyEvent;
    logger.info("MCPサーバー状態変更", {
      name: event.payload.name,
      status: event.payload.status,
      error: event.payload.error,
    });
    return;
  }

  // ProxyResponseの場合
  const response = message as ProxyResponse;
  if (!("id" in response) || typeof response.id !== "string") {
    logger.warn("Proxy Processから不明な形式のメッセージを受信しました", {
      msg,
    });
    return;
  }

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
    void spawnProxy();
  }, delay);
};

/**
 * Proxy Processを起動
 */
const spawnProxy = async (): Promise<void> => {
  // 既存のリトライタイマーをキャンセル
  if (processRetryTimer) {
    clearTimeout(processRetryTimer);
    processRetryTimer = null;
  }

  // process.ts のビルド成果物パスを解決
  // electron-viteビルド時: dist-electron/main/mcp-process.cjs
  // 開発時: 同じディレクトリ
  const processPath = join(__dirname, "mcp-process.cjs");

  proxyProcess = fork(processPath, [], {
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });

  proxyProcess.on("message", handleMessage);

  proxyProcess.on("exit", (code, signal) => {
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

/**
 * MCPサーバーを起動（IPC経由）
 */
export const startMcpServers = async (): Promise<McpServerState[]> => {
  if (!proxyProcess) {
    await spawnProxy();
  }

  const response = await sendRequest("start");
  if (!response.ok) {
    throw new Error(response.error ?? "MCPサーバーの起動に失敗しました");
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
    throw new Error(response.error ?? "MCPサーバーの停止に失敗しました");
  }
};

/**
 * ツール一覧を取得（IPC経由）
 */
export const listMcpTools = async (): Promise<McpToolInfo[]> => {
  if (!proxyProcess) {
    logger.warn("listMcpTools: Proxy Processが起動していません");
    return [];
  }

  const response = await sendRequest("list-tools");
  if (!response.ok) {
    throw new Error(response.error ?? "ツール一覧の取得に失敗しました");
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
    throw new Error(response.error ?? "ツール実行に失敗しました");
  }

  return response.result as CallToolResult;
};

/**
 * MCPサーバーの状態を取得（IPC経由）
 */
export const getMcpStatus = async (): Promise<McpServerState[]> => {
  if (!proxyProcess) {
    logger.warn("getMcpStatus: Proxy Processが起動していません");
    return [];
  }

  const response = await sendRequest("status");
  if (!response.ok) {
    throw new Error(response.error ?? "状態取得に失敗しました");
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

  proxyProcess.kill();
  proxyProcess = null;

  // 保留中のリクエストを全てエラーにしてからクリア
  for (const [, pending] of pendingRequests) {
    pending.reject(new Error("Proxy Processが停止されました"));
  }
  pendingRequests = new Map();
  processRetryCount = 0;

  logger.info("Proxy Processを停止しました");
};
