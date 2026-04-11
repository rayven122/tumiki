import type {
  CallToolResult,
  Logger,
  McpServerConfig,
  McpServerState,
  McpToolInfo,
  ServerStatus,
} from "./types.js";
import { createToolAggregator } from "./outbound/tool-aggregator.js";
import { createUpstreamClient } from "./outbound/upstream-client.js";
import { createUpstreamPool } from "./outbound/upstream-pool.js";

export type ProxyCore = {
  startAll: () => Promise<void>;
  stopAll: () => Promise<void>;
  start: (name: string) => Promise<McpServerState>;
  stop: (name: string) => Promise<void>;
  listTools: () => Promise<McpToolInfo[]>;
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResult>;
  getStatus: () => McpServerState[];
  onStatusChange: (
    cb: (name: string, status: ServerStatus, error?: string) => void,
  ) => void;
};

/**
 * 単一サーバー用ProxyCoreを生成（--server指定時のCLIモードで使用）
 * ToolAggregatorを使わず、UpstreamClientに直接委譲する（prefixなし）
 */
export const createSingleServerCore = (
  config: McpServerConfig,
  logger: Logger,
): ProxyCore => {
  const client = createUpstreamClient(config, logger);

  return {
    startAll: () => client.connect(),
    stopAll: () => client.disconnect(),
    start: async (name: string) => {
      if (name !== config.name) {
        throw new Error(`サーバー "${name}" は登録されていません`);
      }
      await client.connect();
      const tools = await client.listTools();
      return {
        name: config.name,
        status: client.getStatus(),
        error: client.getLastError(),
        tools,
      };
    },
    stop: async (name: string) => {
      if (name !== config.name) {
        throw new Error(`サーバー "${name}" は登録されていません`);
      }
      await client.disconnect();
    },
    listTools: () => client.listTools(),
    callTool: (name: string, args: Record<string, unknown>) =>
      client.callTool(name, args),
    getStatus: () => [
      {
        name: config.name,
        status: client.getStatus(),
        error: client.getLastError(),
        tools: [],
      },
    ],
    onStatusChange: (
      cb: (name: string, status: ServerStatus, error?: string) => void,
    ) => client.onStatusChange(cb),
  };
};

/**
 * ProxyCoreを生成（cli.ts / process.ts で共通利用）
 * UpstreamPool（ライフサイクル管理）+ ToolAggregator（ツール集約・ルーティング）を組み合わせる
 */
export const createProxyCore = (
  configs: McpServerConfig[],
  logger: Logger,
): ProxyCore => {
  const pool = createUpstreamPool(logger);
  for (const config of configs) {
    pool.addServer(config);
  }

  // pool.getClients を getter として渡し、listTools/callTool 時に最新のMapを参照する
  const aggregator = createToolAggregator(() => pool.getClients(), logger);

  return {
    startAll: () => pool.startAll(),
    stopAll: () => pool.stopAll(),
    start: (name: string) => pool.start(name),
    stop: (name: string) => pool.stop(name),
    listTools: () => aggregator.listTools(),
    callTool: (name: string, args: Record<string, unknown>) =>
      aggregator.callTool(name, args),
    getStatus: () => pool.getStatus(),
    onStatusChange: (
      cb: (name: string, status: ServerStatus, error?: string) => void,
    ) => pool.onStatusChange(cb),
  };
};
