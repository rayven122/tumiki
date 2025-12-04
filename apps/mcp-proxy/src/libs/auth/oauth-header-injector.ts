/**
 * OAuth認証ヘッダー注入ミドルウェア
 *
 * @tumiki/oauth-token-manager を使用してトークンを取得し、
 * リモートMCPサーバーへのリクエストに認証ヘッダーを注入
 */

import {
  getValidToken,
  ReAuthRequiredError,
  isDecryptedToken,
} from "@tumiki/oauth-token-manager";
import type { McpConfig, McpServerTemplate } from "@tumiki/db/prisma";
import { getCloudRunIdToken } from "./cloudRunAuth.js";
import { logInfo, logError } from "../logger/index.js";
import { z } from "zod";

/**
 * envVars の型安全なパーススキーマ
 * Record<string, string> の形式を強制
 */
const envVarsSchema = z.record(z.string(), z.string());

/**
 * 認証ヘッダーを注入
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート情報
 * @param mcpConfig - MCPサーバー設定（認証情報）
 * @param headers - リクエストヘッダー（in-place更新）
 */
export const injectAuthHeaders = async (
  mcpServerTemplate: McpServerTemplate,
  mcpConfig: McpConfig,
  headers: Record<string, string>,
): Promise<void> => {
  const { authType } = mcpServerTemplate;

  switch (authType) {
    case "OAUTH": {
      await injectOAuthHeaders(mcpConfig, headers);
      break;
    }

    case "API_KEY": {
      await injectApiKeyHeaders(mcpServerTemplate, mcpConfig, headers);
      break;
    }

    case "NONE": {
      // 認証不要
      logInfo("No authentication required for MCP server", {
        mcpServerTemplateId: mcpServerTemplate.id,
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
  mcpConfig: McpConfig,
  headers: Record<string, string>,
): Promise<void> => {
  try {
    // userIdの検証
    if (!mcpConfig.userId) {
      throw new Error(
        `userId is required for OAuth authentication. MCP Config ID: ${mcpConfig.id}`,
      );
    }

    // @tumiki/oauth-token-manager でトークンを取得
    // 自動的にキャッシュから取得、期限切れ間近ならリフレッシュ
    const rawToken = await getValidToken(
      mcpConfig.mcpServerTemplateId,
      mcpConfig.userId,
    );

    // 型ガードで検証
    if (!isDecryptedToken(rawToken)) {
      throw new Error("Invalid token format received from OAuth manager");
    }

    // Authorization: Bearer ヘッダーを追加
    headers.Authorization = `Bearer ${rawToken.accessToken}`;

    // トークンのプレビュー（最初の20文字）
    const tokenPreview =
      rawToken.accessToken.length > 20
        ? rawToken.accessToken.substring(0, 20)
        : rawToken.accessToken;

    logInfo("OAuth token injected successfully", {
      mcpConfigId: mcpConfig.id,
      expiresAt: rawToken.expiresAt,
      tokenPreview,
    });
  } catch (error) {
    if (error instanceof ReAuthRequiredError) {
      // 再認証が必要な場合
      logError("OAuth re-authentication required", error as Error);

      throw new Error(
        `OAuth token expired or invalid. Please re-authenticate in the Tumiki dashboard. ` +
          `MCP Config ID: ${mcpConfig.id}`,
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
const injectApiKeyHeaders = async (
  mcpServerTemplate: McpServerTemplate,
  mcpConfig: McpConfig,
  headers: Record<string, string>,
): Promise<void> => {
  try {
    // Cloud Run IAM認証が必要な場合、Authorizationヘッダーを追加
    if (mcpServerTemplate.useCloudRunIam && mcpServerTemplate.url) {
      const idToken = await getCloudRunIdToken(mcpServerTemplate.url);
      headers.Authorization = `Bearer ${idToken}`;

      logInfo("Cloud Run IAM authorization header added", {
        mcpServerTemplateId: mcpServerTemplate.id,
        mcpServerTemplateName: mcpServerTemplate.name,
      });
    }
    // envVarsをパース（Zodで型安全にバリデーション）
    let envVars: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(mcpConfig.envVars);
      envVars = envVarsSchema.parse(parsed);
    } catch (parseError) {
      logError("Failed to parse envVars", parseError as Error);
      throw new Error("Invalid environment variables configuration");
    }

    // MCPサーバーテンプレートで定義されたenvVarKeysのキー名を使用
    // 例: ["Tumiki-API-Key"] → headers["Tumiki-API-Key"] = envVars["Tumiki-API-Key"]
    if (mcpServerTemplate.envVarKeys.length > 0) {
      const headerName = mcpServerTemplate.envVarKeys[0]; // 最初のenvVarをヘッダー名として使用

      if (headerName && envVars[headerName]) {
        headers[headerName] = envVars[headerName];

        logInfo("API key header injected successfully", {
          headerName,
          mcpServerTemplateId: mcpServerTemplate.id,
        });
      } else {
        throw new Error(`API key not found for header: ${headerName}`);
      }
    } else {
      // デフォルトヘッダー名を使用
      const defaultHeaderName = "Tumiki-API-Key";
      const apiKey = envVars[defaultHeaderName] || envVars.API_KEY;

      if (apiKey) {
        headers[defaultHeaderName] = apiKey;

        logInfo("API key header injected with default header name", {
          headerName: defaultHeaderName,
          mcpServerTemplateId: mcpServerTemplate.id,
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
