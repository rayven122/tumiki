/**
 * @fileoverview シンプルなRemote MCPクライアント作成
 *
 * プール管理なし、リクエストごとに接続を作成・破棄
 * Cloud Runステートレス環境に最適化
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { RemoteMcpServerConfig } from "../../server/config.js";
import { logInfo, logError } from "../logger/index.js";

/**
 * Remote MCPサーバーに接続するクライアントを作成
 *
 * @param namespace サーバーの名前空間
 * @param config Remote MCPサーバー設定
 * @returns クライアントとトランスポート
 */
export const createMcpClient = async (
  namespace: string,
  config: RemoteMcpServerConfig,
): Promise<{
  client: Client;
  transport: Transport;
}> => {
  let transport: Transport;

  try {
    const transportType = config.transportType ?? "sse"; // デフォルトはSSE

    switch (transportType) {
      case "sse": {
        // SSEトランスポートを使用してRemote MCPサーバーに接続
        const url = new URL(config.url);
        transport = new SSEClientTransport(url);
        logInfo("Using SSE transport", { namespace, url: config.url });
        break;
      }

      case "http": {
        // HTTPトランスポート（Streamable HTTP）
        // 注: MCP SDKにはHTTPClientTransportがないため、SSEを使用
        // 将来的にHTTPClientTransportが追加された場合に対応
        const url = new URL(config.url);
        transport = new SSEClientTransport(url);
        logInfo("Using HTTP transport (via SSE)", {
          namespace,
          url: config.url,
        });
        break;
      }

      case "stdio": {
        // Stdioトランスポート（ローカルプロセス起動）
        // urlをコマンドとして解釈
        const [command, ...args] = config.url.split(" ");
        if (!command) {
          throw new Error(
            "Stdio transport requires a command in the url field",
          );
        }
        transport = new StdioClientTransport({
          command,
          args,
        });
        logInfo("Using Stdio transport", {
          namespace,
          command,
          args,
        });
        break;
      }

      default:
        throw new Error(
          `Unsupported transport type: ${transportType as string}`,
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create transport for ${namespace}: ${errorMessage}`,
    );
  }

  // クライアントの作成
  const client = new Client({
    name: "mcp-proxy-client",
    version: "1.0.0",
  });

  try {
    logInfo("Creating MCP connection", { namespace });

    // トランスポートに接続
    await client.connect(transport);

    logInfo("MCP connection created successfully", { namespace });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(
      `Failed to connect to Remote MCP server ${namespace}`,
      error as Error,
    );
    throw new Error(
      `Failed to connect to Remote MCP server ${namespace}: ${errorMessage}`,
    );
  }

  return { client, transport };
};
