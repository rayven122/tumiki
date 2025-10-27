/**
 * Remote MCP サーバー設定型
 */
export type RemoteMcpServerConfig = {
  namespace: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "api_key";
  authToken?: string;
  headers?: Record<string, string>;
  enabled: boolean;
};

/**
 * Remote MCP サーバー設定
 *
 * Phase 2 で実装予定:
 * - 実際のリモート MCP サーバーへの接続
 * - ツールの動的ルーティング
 * - 名前空間管理
 * - Redis/Memcached キャッシュ統合
 *
 * 現在の実装:
 * - サンプルツール（echo, health）のみ提供
 * - Cloud Run ステートレス環境に最適化
 *
 * @example
 * ```typescript
 * {
 *   namespace: "github",
 *   name: "GitHub MCP Server",
 *   url: "https://mcp.example.com",
 *   authType: "bearer",
 *   authToken: process.env.GITHUB_TOKEN,
 *   enabled: true,
 * }
 * ```
 */
export const REMOTE_MCP_SERVERS: RemoteMcpServerConfig[] = [
  // 例: GitHubサーバー（実際のURLに置き換える必要があります）
  // {
  //   namespace: "github",
  //   name: "GitHub MCP Server",
  //   url: "https://github-mcp.example.com",
  //   authType: "bearer",
  //   authToken: process.env.GITHUB_TOKEN,
  //   enabled: true,
  // },
  // 例: Slackサーバー（実際のURLに置き換える必要があります）
  // {
  //   namespace: "slack",
  //   name: "Slack MCP Server",
  //   url: "https://slack-mcp.example.com",
  //   authType: "bearer",
  //   authToken: process.env.SLACK_TOKEN,
  //   enabled: true,
  // },
];

/**
 * 有効なRemote MCPサーバーのリストを取得
 */
export const getEnabledServers = (): RemoteMcpServerConfig[] => {
  return REMOTE_MCP_SERVERS.filter((server) => server.enabled);
};

/**
 * 名前空間からサーバー設定を取得
 */
export const getServerByNamespace = (
  namespace: string,
): RemoteMcpServerConfig | undefined => {
  return REMOTE_MCP_SERVERS.find((server) => server.namespace === namespace);
};
