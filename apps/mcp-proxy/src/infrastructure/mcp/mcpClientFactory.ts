import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  connectMcpClient,
  type AuthType,
  type McpServerConfig,
} from "@tumiki/mcp-core-proxy";
import type {
  McpConfig as DbMcpConfig,
  McpServerTemplate,
} from "@tumiki/db/prisma";
import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";
import { injectAuthHeaders } from "./authHeaderInjector.js";
import { logError, logInfo } from "../../shared/logger/index.js";

/**
 * McpServerTemplate と McpConfig から MCP クライアントを作成
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート
 * @param userId - ユーザーID（OAuth認証時に使用）
 * @param mcpServerTemplateInstanceId - MCPサーバーテンプレートインスタンスID（OAuth認証時に使用）
 * @param mcpConfig - MCPサーバー設定（認証情報、オプショナル）
 * @returns MCP クライアント
 */
export const connectToMcpServer = async (
  mcpServerTemplate: McpServerTemplate,
  userId: string,
  mcpServerTemplateInstanceId: string,
  mcpConfig: DbMcpConfig | null,
): Promise<Client> => {
  const { transportType, name, authType } = mcpServerTemplate;
  const mappedAuthType: AuthType =
    mcpServerTemplate.authType === "OAUTH"
      ? "BEARER"
      : mcpServerTemplate.authType;

  logInfo("Connecting to MCP server", {
    templateName: name,
    transportType,
    authType,
    userId,
    mcpServerTemplateInstanceId,
  });

  try {
    // 認証ヘッダーを注入
    const headers: Record<string, string> = await injectAuthHeaders(
      mcpServerTemplate,
      userId,
      mcpServerTemplateInstanceId,
      mcpConfig,
    );
    const baseConfig = {
      name,
      headers,
      authType: mappedAuthType,
    };
    const connectWithCore = (config: McpServerConfig): Promise<Client> =>
      connectMcpClient(config, {
        clientName: `tumiki-mcp-proxy-${name}`,
      });

    switch (transportType) {
      case "STDIO":
        throw new Error(
          `STDIO transport is not supported for template ${name}. Please use SSE or STREAMABLE_HTTPS instead.`,
        );

      case "SSE": {
        const url = mcpServerTemplate.url;
        if (!url) {
          throw new Error(`SSE transport requires URL for template ${name}`);
        }

        return await connectWithCore({
          ...baseConfig,
          transportType: "SSE",
          url,
        });
      }

      case "STREAMABLE_HTTPS": {
        const url = mcpServerTemplate.url;
        if (!url) {
          throw new Error(
            `STREAMABLE_HTTPS transport requires URL for template ${name}`,
          );
        }

        return await connectWithCore({
          ...baseConfig,
          transportType: "STREAMABLE_HTTP",
          url,
        });
      }

      default: {
        const _exhaustiveCheck: never = transportType;
        throw new Error(`Unknown transport type: ${String(_exhaustiveCheck)}`);
      }
    }
  } catch (error) {
    // ReAuthRequiredError はそのまま伝播させる（401 レスポンス生成のため）
    if (error instanceof ReAuthRequiredError) {
      throw error;
    }
    logError("Failed to connect to MCP server", error as Error, {
      templateName: name,
      transportType,
    });
    throw new Error(
      `Failed to connect to MCP server ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
