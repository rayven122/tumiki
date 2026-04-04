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

// PoCハードコード設定（本番化時に設定ファイルまたはDB読み込みに移行予定）
// 既知の制約: uvx --from git+... はGitHubリポジトリを直接実行するためサプライチェーンリスクがある。
// 本番化時にPyPI経由またはコミットSHA固定に移行する（DEV-1450で追跡中）。PoCスコープでは許容。
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
