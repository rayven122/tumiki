/**
 * Remote MCP サーバー設定型
 */
export type RemoteMcpServerConfig = {
  enabled: boolean;
  name: string;
  url: string;
  authType: "none" | "bearer" | "api_key";
  authToken?: string;
  headers?: Record<string, string>;
};

/**
 * Remote MCP サーバー設定全体の型
 */
export type RemoteMcpServersConfig = {
  mcpServers: Record<string, RemoteMcpServerConfig>;
};

/**
 * Remote MCP サーバー設定
 *
 * sparfenyuk/mcp-proxyのNamed Servers形式を参考にした設定
 * 各サーバーはキー（namespace）で識別され、enabledフラグで制御される
 *
 * @example
 * ```json
 * {
 *   "mcpServers": {
 *     "github": {
 *       "enabled": true,
 *       "name": "GitHub MCP Server",
 *       "url": "https://github-mcp.example.com/sse",
 *       "authType": "bearer",
 *       "authToken": "${GITHUB_TOKEN}"
 *     }
 *   }
 * }
 * ```
 */
export const REMOTE_MCP_SERVERS_CONFIG: RemoteMcpServersConfig = {
  mcpServers: {
    // 例: GitHubサーバー（実際のURLに置き換える必要があります）
    // github: {
    //   enabled: true,
    //   name: "GitHub MCP Server",
    //   url: "https://github-mcp.example.com/sse",
    //   authType: "bearer",
    //   authToken: process.env.GITHUB_TOKEN,
    //   headers: {},
    // },
    // 例: Slackサーバー（実際のURLに置き換える必要があります）
    // slack: {
    //   enabled: false,
    //   name: "Slack MCP Server",
    //   url: "https://slack-mcp.example.com/sse",
    //   authType: "bearer",
    //   authToken: process.env.SLACK_TOKEN,
    //   headers: {},
    // },
  },
};

/**
 * 有効なRemote MCPサーバーのリストを取得
 * @returns [namespace, config]のタプルの配列
 */
export const getEnabledServers = (): Array<{
  namespace: string;
  config: RemoteMcpServerConfig;
}> => {
  return Object.entries(REMOTE_MCP_SERVERS_CONFIG.mcpServers)
    .filter(([_, config]) => config.enabled)
    .map(([namespace, config]) => ({ namespace, config }));
};

/**
 * 名前空間からサーバー設定を取得
 */
export const getServerByNamespace = (
  namespace: string,
): RemoteMcpServerConfig | undefined => {
  return REMOTE_MCP_SERVERS_CONFIG.mcpServers[namespace];
};
