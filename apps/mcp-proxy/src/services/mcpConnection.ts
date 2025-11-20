import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpConfig, McpServerTemplate } from "@tumiki/db/prisma";
import { injectAuthHeaders } from "../libs/auth/oauth-header-injector.js";
import { logError, logInfo } from "../libs/logger/index.js";

/**
 * McpServerTemplate と McpConfig から MCP クライアントを作成
 *
 * @param mcpServerTemplate - MCPサーバーテンプレート
 * @param mcpConfig - MCPサーバー設定（認証情報）
 * @returns MCP クライアント
 */
export const connectToMcpServer = async (
  mcpServerTemplate: McpServerTemplate,
  mcpConfig: McpConfig | null,
): Promise<Client> => {
  const { transportType, name } = mcpServerTemplate;

  logInfo("Connecting to MCP server", {
    templateName: name,
    transportType,
  });

  try {
    // トランスポートタイプに応じてクライアントを作成
    let transport;
    const headers: Record<string, string> = {};

    // 認証ヘッダーを注入
    if (mcpConfig) {
      await injectAuthHeaders(mcpServerTemplate, mcpConfig, headers);
    }

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
        const command = mcpServerTemplate.command;
        const args = mcpServerTemplate.args;

        if (!command) {
          throw new Error(
            `STDIO transport requires command for template ${name}`,
          );
        }

        transport = new StdioClientTransport({
          command,
          args,
          env: mcpConfig ? JSON.parse(mcpConfig.envVars) : undefined,
        });
        break;
      }

      case "STREAMABLE_HTTPS": {
        // STREAMABLE_HTTPSトランスポートは現在未実装
        throw new Error(
          `STREAMABLE_HTTPS transport is not yet supported for template ${name}`,
        );
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
    logError("Failed to connect to MCP server", error as Error, {
      templateName: name,
      transportType,
    });
    throw new Error(
      `Failed to connect to MCP server ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
