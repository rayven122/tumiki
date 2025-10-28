/**
 * @fileoverview シンプルなRemote MCPクライアント作成
 *
 * プール管理なし、リクエストごとに接続を作成・破棄
 * Cloud Runステートレス環境に最適化
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
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
        // 下位互換性のため、失敗した場合はSSEにフォールバック
        const url = new URL(config.url);
        transport = new StreamableHTTPClientTransport(url);
        logInfo("Using Streamable HTTP transport", {
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
    // HTTPトランスポートが失敗した場合、SSEにフォールバック
    const transportType = config.transportType ?? "sse";
    if (transportType === "http") {
      logInfo(
        "Streamable HTTP connection failed, falling back to SSE transport",
        { namespace },
      );
      try {
        // トランスポートをクローズ（エラーは無視）
        await transport.close().catch(() => {
          // クローズエラーは無視（フォールバック処理のため）
        });

        // SSEトランスポートで再試行
        const url = new URL(config.url);
        transport = new SSEClientTransport(url);

        logInfo("Retrying with SSE transport", { namespace });
        await client.connect(transport);

        logInfo("MCP connection created successfully with SSE fallback", {
          namespace,
        });

        return { client, transport };
      } catch (fallbackError) {
        const errorMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
        logError(
          `Failed to connect to Remote MCP server ${namespace} (SSE fallback also failed)`,
          fallbackError as Error,
        );
        throw new Error(
          `Failed to connect to Remote MCP server ${namespace}: ${errorMessage}`,
        );
      }
    }

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
