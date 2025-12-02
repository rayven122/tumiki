import type { McpServer } from "./constants/mcpServers";
import { MCP_ENV_MOCK_KEYS } from "./constants/mcpEnvMockKeys";
import { MCP_SERVERS } from "./constants/mcpServers";

/**
 * 環境変数の型定義
 */
export type Env = Record<string, string | undefined>;

/**
 * 環境変数をバリデーションする
 * 実際の環境変数が設定されていない場合は、モックキーを使用する
 * @returns バリデーション済みの環境変数
 */
export const validateEnv = (): Env => {
  const env: Env = { ...process.env };

  // モックキーで実際の環境変数を補完
  for (const [key, value] of Object.entries(MCP_ENV_MOCK_KEYS)) {
    if (!env[key] || env[key] === "") {
      env[key] = value;
    }
  }

  return env;
};

/**
 * 有効なMCPサーバーを取得する（すべての環境変数が設定されているサーバー）
 * @param env 環境変数
 * @returns 有効なMCPサーバーのリスト
 */
export const getValidMcpServers = (env: Env): McpServer[] => {
  return MCP_SERVERS.filter((server) => {
    // API_KEY認証の場合のみenvVarKeysをチェック
    if (server.authType === "API_KEY") {
      // envVarKeysが空の場合は常に有効
      if (server.envVarKeys.length === 0) {
        return true;
      }

      // すべての環境変数が設定されているかチェック
      return server.envVarKeys.every((key: string) => {
        const value = env[key];
        return value !== undefined && value !== "";
      });
    }

    // NONE または OAUTH の場合は常に有効
    return true;
  });
};
