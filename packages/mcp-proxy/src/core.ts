import { createUpstreamPool } from "./upstream-pool.js";
import type {
  McpServerConfig,
  McpServerState,
  McpToolInfo,
  CallToolResult,
  ServerStatus,
  Logger,
} from "./types.js";

// TODO: 設定ファイルまたはDBから読み込むように変更する
// PoCハードコード設定（.mcp.json の設定に合わせる）
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
 */
export const createProxyCore = (
  configs: McpServerConfig[],
  logger: Logger,
): ProxyCore => {
  const pool = createUpstreamPool(logger);
  for (const config of configs) {
    pool.addServer(config);
  }

  return {
    startAll: () => pool.startAll(),
    stopAll: () => pool.stopAll(),
    start: (name: string) => pool.start(name),
    stop: (name: string) => pool.stop(name),
    listTools: () => pool.listTools(),
    callTool: (name: string, args: Record<string, unknown>) =>
      pool.callTool(name, args),
    getStatus: () => pool.getStatus(),
    onStatusChange: (
      cb: (name: string, status: ServerStatus, error?: string) => void,
    ) => pool.onStatusChange(cb),
  };
};
