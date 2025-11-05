/**
 * OAuth認証ヘッダー注入ミドルウェア
 *
 * @tumiki/oauth-token-manager を使用してトークンを取得し、
 * リモートMCPサーバーへのリクエストに認証ヘッダーを注入
 */

import {
  getValidToken,
  ReAuthRequiredError,
} from "@tumiki/oauth-token-manager";
import type { McpServer, UserMcpServerConfig } from "@tumiki/db/prisma";
import { logInfo, logError } from "../libs/logger/index.js";

/**
 * 認証ヘッダーを注入
 *
 * @param mcpServer - MCPサーバー情報
 * @param userMcpConfig - ユーザーMCPサーバー設定
 * @param headers - リクエストヘッダー（in-place更新）
 */
export const injectAuthHeaders = async (
  mcpServer: McpServer,
  userMcpConfig: UserMcpServerConfig,
  headers: Record<string, string>,
): Promise<void> => {
  const { authType } = mcpServer;

  switch (authType) {
    case "OAUTH": {
      await injectOAuthHeaders(userMcpConfig, headers);
      break;
    }

    case "API_KEY": {
      injectApiKeyHeaders(mcpServer, userMcpConfig, headers);
      break;
    }

    case "NONE": {
      // 認証不要
      logInfo("No authentication required for MCP server", {
        mcpServerId: mcpServer.id,
      });
      break;
    }

    case "CLOUD_RUN_IAM": {
      // Cloud Run IAM認証（別途実装）
      logInfo("Cloud Run IAM authentication not yet implemented", {
        mcpServerId: mcpServer.id,
      });
      break;
    }

    default: {
      const _exhaustiveCheck: never = authType;
      throw new Error(`Unknown auth type: ${String(_exhaustiveCheck)}`);
    }
  }
};

/**
 * OAuthトークンを取得してAuthorizationヘッダーに注入
 */
const injectOAuthHeaders = async (
  userMcpConfig: UserMcpServerConfig,
  headers: Record<string, string>,
): Promise<void> => {
  try {
    // @tumiki/oauth-token-manager でトークンを取得
    // 自動的にキャッシュから取得、期限切れ間近ならリフレッシュ
    const token = await getValidToken(
      userMcpConfig.id,
      userMcpConfig.organizationId,
    );

    // Authorization: Bearer ヘッダーを追加
    headers.Authorization = `Bearer ${token.accessToken}`;

    logInfo("OAuth token injected successfully", {
      userMcpConfigId: userMcpConfig.id,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    if (error instanceof ReAuthRequiredError) {
      // 再認証が必要な場合
      logError("OAuth re-authentication required", error as Error);

      throw new Error(
        `OAuth token expired or invalid. Please re-authenticate in the Tumiki dashboard. ` +
          `User MCP Config ID: ${userMcpConfig.id}`,
      );
    }

    // その他のエラー
    logError("Failed to inject OAuth headers", error as Error);
    throw new Error(
      `Failed to obtain OAuth token: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * APIキーをヘッダーに注入
 */
const injectApiKeyHeaders = (
  mcpServer: McpServer,
  userMcpConfig: UserMcpServerConfig,
  headers: Record<string, string>,
): void => {
  try {
    // envVarsをパース
    const envVars = JSON.parse(userMcpConfig.envVars) as Record<string, string>;

    // MCPサーバーで定義されたenvVarsのキー名を使用
    // 例: ["X-API-Key"] → headers["X-API-Key"] = envVars["X-API-Key"]
    if (mcpServer.envVars.length > 0) {
      const headerName = mcpServer.envVars[0]; // 最初のenvVarをヘッダー名として使用

      if (headerName && envVars[headerName]) {
        headers[headerName] = envVars[headerName];

        logInfo("API key header injected successfully", {
          headerName,
          mcpServerId: mcpServer.id,
        });
      } else {
        throw new Error(`API key not found for header: ${headerName}`);
      }
    } else {
      // デフォルトヘッダー名を使用
      const defaultHeaderName = "X-API-Key";
      const apiKey = envVars[defaultHeaderName] || envVars.API_KEY;

      if (apiKey) {
        headers[defaultHeaderName] = apiKey;

        logInfo("API key header injected with default header name", {
          headerName: defaultHeaderName,
          mcpServerId: mcpServer.id,
        });
      } else {
        throw new Error("API key not found in environment variables");
      }
    }
  } catch (error) {
    logError("Failed to inject API key headers", error as Error);
    throw new Error(
      `Failed to inject API key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
