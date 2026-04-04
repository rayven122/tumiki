import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import type {
  CallToolResult,
  Logger,
  McpServerConfig,
  McpToolInfo,
  ServerStatus,
} from "../types.js";

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MULTIPLIER = 3;

/**
 * UpstreamClient型
 */
export type UpstreamClient = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  listTools: () => Promise<McpToolInfo[]>;
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResult>;
  getStatus: () => ServerStatus;
  getName: () => string;
  getLastError: () => string | undefined;
  onStatusChange: (
    callback: (name: string, status: ServerStatus, error?: string) => void,
  ) => void;
};

/**
 * 1つのMCPサーバーへのstdio接続を管理するクライアントを作成
 */
export const createUpstreamClient = (
  config: McpServerConfig,
  logger: Logger,
): UpstreamClient => {
  // 内部状態
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;
  let status: ServerStatus = "stopped";
  const statusChangeCallbacks: Array<
    (name: string, status: ServerStatus, error?: string) => void
  > = [];
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let lastError: string | undefined;
  // handleCrashの二重呼び出し防止フラグ（onclose/onerrorが両方発火するケース対策）
  let crashHandled = false;

  // 子プロセスに渡す環境変数を最小限に制限（Credential Leak防止）
  // process.env全体を渡すとDB接続文字列やOAuthトークン等が漏洩するリスクがある
  const SAFE_ENV_KEYS = [
    "PATH",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "TEMP",
    "TMP",
    "TMPDIR",
    "LANG",
    "USER",
    "USERNAME",
    "SHELL",
    "TERM",
    "NODE_ENV",
  ];
  const safeBaseEnv = Object.fromEntries(
    SAFE_ENV_KEYS.flatMap((key) => {
      const val = process.env[key];
      return val !== undefined ? [[key, val]] : [];
    }),
  );
  const mergedEnv = { ...safeBaseEnv, ...config.env };

  /**
   * 状態を更新し、コールバックを呼び出す
   */
  const setStatus = (newStatus: ServerStatus, error?: string): void => {
    status = newStatus;
    if (error) {
      lastError = error;
    }
    for (const cb of statusChangeCallbacks) {
      try {
        cb(config.name, newStatus, error);
      } catch (callbackError) {
        logger.error("状態変更コールバックでエラーが発生しました", {
          error:
            callbackError instanceof Error
              ? callbackError.message
              : callbackError,
        });
      }
    }
  };

  /**
   * 接続試行（リトライ対応）
   */
  const attemptConnect = async (): Promise<void> => {
    try {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: mergedEnv,
      });

      client = new Client({
        name: "tumiki-proxy",
        version: "1.0.0",
      });

      // 子プロセスのクラッシュを検知
      // onclose/onerrorが両方発火するケースがあるため、crashHandledで二重呼び出しを防止
      crashHandled = false;

      transport.onclose = () => {
        if (status === "running" && !crashHandled) {
          crashHandled = true;
          logger.warn(`MCPサーバー "${config.name}" の接続が切断されました`);
          handleCrash();
        }
      };

      transport.onerror = (error) => {
        logger.error(`MCPサーバー "${config.name}" でエラー発生`, error);
        // oncloseが発火しない場合に備えて、handleCrashでリトライ/エラー状態遷移を一元管理
        if (status === "running" && !crashHandled) {
          crashHandled = true;
          handleCrash();
        }
      };

      await client.connect(transport);

      retryCount = 0;
      setStatus("running");
      logger.info(`MCPサーバー "${config.name}" に接続しました`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      lastError = message;
      logger.error(`MCPサーバー "${config.name}" への接続に失敗: ${message}`);

      // クリーンアップ
      client = null;
      transport = null;

      // リトライ中の再接続失敗時はバックオフを継続
      if (retryCount > 0) {
        handleCrash();
        return;
      }

      setStatus("error", message);
    }
  };

  /**
   * クラッシュ時のリトライ処理
   */
  const handleCrash = (): void => {
    client = null;
    transport = null;

    if (retryCount >= MAX_RETRIES) {
      const message = `リトライ上限（${MAX_RETRIES}回）に達しました`;
      lastError = message;
      setStatus("error", message);
      logger.error(`MCPサーバー "${config.name}" のリトライ上限に達しました`);
      return;
    }

    retryCount++;
    const delay =
      RETRY_BASE_DELAY_MS * Math.pow(RETRY_MULTIPLIER, retryCount - 1);
    logger.info(
      `MCPサーバー "${config.name}" を${delay}ms後にリトライします（${retryCount}/${MAX_RETRIES}）`,
    );

    setStatus("pending");
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void attemptConnect().catch((error) => {
        logger.error(
          `MCPサーバー "${config.name}" のリトライ中に予期しないエラー`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        if (status !== "error") {
          setStatus(
            "error",
            error instanceof Error
              ? error.message
              : "リトライ中の予期しないエラー",
          );
        }
      });
    }, delay);
  };

  /**
   * MCPサーバーに接続
   */
  const connect = async (): Promise<void> => {
    // 既存のリトライタイマーをキャンセル（手動再起動時の二重接続防止）
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    setStatus("pending");
    retryCount = 0;

    await attemptConnect();

    // 初回接続失敗時は呼び出し元にエラーを伝播（リトライ時は伝播しない）
    if (status === "error") {
      throw new Error(
        `MCPサーバー "${config.name}" への接続に失敗しました: ${lastError}`,
      );
    }
  };

  /**
   * MCPサーバーとの接続を切断
   */
  const disconnect = async (): Promise<void> => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    // 意図的な切断時はonclose/onerrorのcrashHandledガードが通過しないように、
    // setStatus()ではなく直接statusを変更する（コールバック通知は下のsetStatus("stopped")で行う）
    status = "stopped";

    if (client) {
      try {
        await client.close();
      } catch (error) {
        logger.warn(
          `MCPサーバー "${config.name}" の切断中にエラー: ${error instanceof Error ? error.message : "不明"}`,
        );
      }
    }

    client = null;
    transport = null;
    retryCount = 0;
    setStatus("stopped");
  };

  /**
   * ツール一覧を取得
   */
  const listTools = async (): Promise<McpToolInfo[]> => {
    if (!client || status !== "running") {
      throw new Error(
        `MCPサーバー "${config.name}" は未接続のためツール一覧を取得できません（status: ${status}）`,
      );
    }

    const result = await client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  };

  /**
   * ツールを実行
   */
  const callTool = async (
    name: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> => {
    if (!client || status !== "running") {
      throw new Error(
        `MCPサーバー "${config.name}" は接続されていません（status: ${status}）`,
      );
    }

    const result = await client.callTool({
      name,
      arguments: args,
    });

    // SDK型からCallToolResult型へ変換
    return {
      content: Array.isArray(result.content)
        ? (result.content as unknown[])
        : [],
      isError: typeof result.isError === "boolean" ? result.isError : undefined,
    };
  };

  return {
    connect,
    disconnect,
    listTools,
    callTool,
    getStatus: () => status,
    getName: () => config.name,
    getLastError: () => lastError,
    onStatusChange: (
      callback: (name: string, status: ServerStatus, error?: string) => void,
    ) => {
      statusChangeCallbacks.push(callback);
    },
  };
};
