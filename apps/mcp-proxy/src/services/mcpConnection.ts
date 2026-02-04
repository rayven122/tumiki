import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpConfig, McpServerTemplate } from "@tumiki/db/prisma";
import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";
import { injectAuthHeaders } from "../libs/auth/oauth-header-injector.js";
import { logError, logInfo } from "../libs/logger/index.js";

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
  mcpConfig: McpConfig | null,
): Promise<Client> => {
  const { transportType, name, authType } = mcpServerTemplate;

  logInfo("Connecting to MCP server", {
    templateName: name,
    transportType,
    authType,
    userId,
    mcpServerTemplateInstanceId,
  });

  try {
    // トランスポートタイプに応じてクライアントを作成
    let transport;

    // 認証ヘッダーを注入
    const headers: Record<string, string> = await injectAuthHeaders(
      mcpServerTemplate,
      userId,
      mcpServerTemplateInstanceId,
      mcpConfig,
    );

    switch (transportType) {
      case "SSE": {
        const url = mcpServerTemplate.url;
        if (!url) {
          throw new Error(`SSE transport requires URL for template ${name}`);
        }

        transport = new SSEClientTransport(new URL(url));
        break;
      }

      case "STDIO": {
        throw new Error(
          `STDIO transport is not supported for template ${name}. Please use SSE or STREAMABLE_HTTPS instead.`,
        );
      }

      case "STREAMABLE_HTTPS": {
        const url = mcpServerTemplate.url;
        if (!url) {
          throw new Error(
            `STREAMABLE_HTTPS transport requires URL for template ${name}`,
          );
        }

        transport = new StreamableHTTPClientTransport(new URL(url), {
          requestInit: {
            headers,
          },
        });
        break;
      }

      default: {
        const _exhaustiveCheck: never = transportType;
        throw new Error(`Unknown transport type: ${String(_exhaustiveCheck)}`);
      }
    }

    // クライアントを作成して接続
    const client = new Client(
      {
        name: `tumiki-mcp-proxy-${name}`,
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await client.connect(transport);

    logInfo("Successfully connected to MCP server", {
      templateName: name,
      transportType,
    });

    return client;
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
