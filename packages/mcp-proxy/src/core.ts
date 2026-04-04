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

// TODO: 設定ファイルまたはDBから読み込むように変更する
// PoCハードコード設定（本番化時に削除）
// ⚠️ サプライチェーンリスク: GitHubから直接実行するため、リポジトリ改ざん時に影響を受ける
export const HARDCODED_CONFIGS: McpServerConfig[] = [
  {
    name: "serena",
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/oraios/serena",
      "serena",
      "start-mcp-server",
      "--enable-web-dashboard",
      "false",
      "--context",
      "ide-assistant",
      "--project",
      ".",
    ],
    env: {},
  },
];

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

  const aggregator = createToolAggregator(pool.getClients(), logger);

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
