import type {
  CallToolResult,
  Logger,
  McpServerConfig,
  McpServerState,
  McpToolInfo,
  ServerStatus,
} from "../types.js";
import type { UpstreamClient } from "./upstream-client.js";
import { createUpstreamClient } from "./upstream-client.js";

/**
 * UpstreamPool型
 */
export type UpstreamPool = {
  addServer: (config: McpServerConfig) => void;
  startAll: () => Promise<void>;
  stopAll: () => Promise<void>;
  start: (name: string) => Promise<McpServerState>;
  stop: (name: string) => Promise<void>;
  listTools: () => Promise<McpToolInfo[]>;
  callTool: (
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResult>;
  getStatus: () => McpServerState[];
  onStatusChange: (
    callback: (name: string, status: ServerStatus, error?: string) => void,
  ) => void;
};

/**
 * UpstreamClientのライフサイクルを管理するプールを作成
 */
export const createUpstreamPool = (logger: Logger): UpstreamPool => {
  const clients = new Map<string, UpstreamClient>();
  const statusChangeCallbacks: Array<
    (name: string, status: ServerStatus, error?: string) => void
  > = [];
  // ツール名 → クライアントのインデックス（callToolの高速化）
  let toolIndex = new Map<string, UpstreamClient>();

  /**
   * クライアントを名前で取得
   */
  const getClient = (name: string): UpstreamClient => {
    const client = clients.get(name);
    if (!client) {
      throw new Error(`サーバー "${name}" は登録されていません`);
    }
    return client;
  };

  /**
   * サーバー設定を追加
   */
  const addServer = (config: McpServerConfig): void => {
    if (clients.has(config.name)) {
      throw new Error(`サーバー "${config.name}" は既に登録されています`);
    }

    const client = createUpstreamClient(config, logger);
    client.onStatusChange((name, status, error) => {
      for (const cb of statusChangeCallbacks) {
        try {
          cb(name, status, error);
        } catch (callbackError) {
          logger.error("状態変更コールバックでエラーが発生しました", {
            error:
              callbackError instanceof Error
                ? callbackError.message
                : callbackError,
          });
        }
      }
    });
    clients.set(config.name, client);
  };

  /**
   * 全サーバーを起動
   */
  const startAll = async (): Promise<void> => {
    const results = await Promise.allSettled(
      [...clients.values()].map((client) => client.connect()),
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      for (const failure of failures) {
        logger.error("MCPサーバーの起動に失敗", {
          error:
            failure.reason instanceof Error
              ? failure.reason.message
              : String(failure.reason),
        });
      }

      // 全サーバー失敗時はエラーをスロー
      if (failures.length === results.length) {
        throw new Error(
          `全てのMCPサーバー（${failures.length}件）の起動に失敗しました`,
        );
      }
    }
  };

  /**
   * 全サーバーを停止
   */
  const stopAll = async (): Promise<void> => {
    const results = await Promise.allSettled(
      [...clients.values()].map((client) => client.disconnect()),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("MCPサーバーの停止に失敗", {
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
  };

  /**
   * 指定サーバーを起動
   */
  const start = async (name: string): Promise<McpServerState> => {
    const client = getClient(name);
    await client.connect();

    const tools = await client.listTools();
    return {
      name,
      status: client.getStatus(),
      error: client.getLastError(),
      tools,
    };
  };

  /**
   * 指定サーバーを停止
   */
  const stop = async (name: string): Promise<void> => {
    const client = getClient(name);
    await client.disconnect();
  };

  /**
   * 全サーバーのツール一覧を集約して返す（並列取得 + インデックス構築）
   */
  const listTools = async (): Promise<McpToolInfo[]> => {
    const clientList = [...clients.values()];
    const results = await Promise.allSettled(
      clientList.map(async (client) => {
        const tools = await client.listTools();
        return { client, tools };
      }),
    );

    // ツールインデックスを再構築
    toolIndex = new Map<string, UpstreamClient>();
    const allTools: McpToolInfo[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const tool of result.value.tools) {
          toolIndex.set(tool.name, result.value.client);
          allTools.push(tool);
        }
      } else {
        logger.error("ツール一覧の取得に失敗したサーバーがあります", {
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
    return allTools;
  };

  /**
   * ツールを実行（インデックスから適切なサーバーを特定）
   */
  const callTool = async (
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> => {
    // インデックスからクライアントを特定
    const client = toolIndex.get(toolName);
    if (client && client.getStatus() === "running") {
      return await client.callTool(toolName, args);
    }

    // インデックスにない場合はlistToolsで再構築してリトライ
    await listTools();
    const retryClient = toolIndex.get(toolName);
    if (retryClient && retryClient.getStatus() === "running") {
      return await retryClient.callTool(toolName, args);
    }

    throw new Error(`ツール "${toolName}" が見つかりません`);
  };

  /**
   * 全サーバーの状態を取得
   */
  const getStatus = (): McpServerState[] => {
    return [...clients.entries()].map(([name, client]) => ({
      name,
      status: client.getStatus(),
      error: client.getLastError(),
      tools: [], // ステータス取得時にはツール一覧は省略（listToolsで取得）
    }));
  };

  return {
    addServer,
    startAll,
    stopAll,
    start,
    stop,
    listTools,
    callTool,
    getStatus,
    onStatusChange: (
      callback: (name: string, status: ServerStatus, error?: string) => void,
    ) => {
      statusChangeCallbacks.push(callback);
    },
  };
};
