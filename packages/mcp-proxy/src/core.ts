import type {
  CallToolResult,
  Logger,
  McpServerConfig,
  McpServerState,
  McpToolInfo,
  ServerStatus,
} from "./types.js";
import { createToolAggregator } from "./outbound/tool-aggregator.js";
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
