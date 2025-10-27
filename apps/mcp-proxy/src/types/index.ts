/**
 * 認証情報
 */
export type AuthInfo = {
  organizationId: string;
  mcpServerInstanceId: string;
  apiKeyId: string;
  apiKey: string;
};

/**
 * 名前空間付きツール
 */
export type NamespacedTool = {
  name: string; // "github.create_issue"
  namespace: string; // "github"
  originalName: string; // "create_issue"
  description: string;
  inputSchema: unknown;
};

/**
 * ツール実行結果
 */
export type ToolCallResult = {
  content: Array<{
    type: string;
    text: string;
  }>;
};

/**
 * 接続プール統計情報
 */
export type PoolStats = {
  totalConnections: number;
  healthyConnections: number;
  connections: Array<{
    namespace: string;
    lastUsed: number;
    isHealthy: boolean;
    idleTime: number;
  }>;
};
