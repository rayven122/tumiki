/**
 * MCP接続確認ユーティリティ
 *
 * リモートMCPサーバー（Streamable HTTP / SSE）に接続し、
 * ツール一覧を取得して接続確認を行う。
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import * as logger from "../../shared/utils/logger";

/** 接続タイムアウト（ミリ秒） */
const CONNECTION_TIMEOUT_MS = 10_000;

/** ツール情報（DB保存用） */
export type McpToolData = {
  name: string;
  description: string;
  inputSchema: string;
};

/**
 * Streamable HTTP MCPサーバーからツール一覧を取得
 */
export const listToolsHTTP = async (
  url: string,
  headers: Record<string, string>,
): Promise<McpToolData[]> => {
  const client = new Client({ name: "tumiki-desktop", version: "1.0.0" });

  try {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          ...headers,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
      },
    });

    await Promise.race([
      client.connect(transport),
      createTimeout(CONNECTION_TIMEOUT_MS),
    ]);

    const { tools } = await client.listTools();
    await client.close();

    return tools.map(toMcpToolData);
  } catch (error) {
    await client.close().catch(() => {});
    logger.error("Streamable HTTP MCPサーバーへの接続に失敗しました", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * SSE MCPサーバーからツール一覧を取得
 */
export const listToolsSSE = async (
  url: string,
  headers: Record<string, string>,
): Promise<McpToolData[]> => {
  const client = new Client({ name: "tumiki-desktop", version: "1.0.0" });

  try {
    const transport = new SSEClientTransport(new URL(url), {
      requestInit: { headers },
    });

    await Promise.race([
      client.connect(transport),
      createTimeout(CONNECTION_TIMEOUT_MS),
    ]);

    const { tools } = await client.listTools();
    await client.close();

    return tools.map(toMcpToolData);
  } catch (error) {
    await client.close().catch(() => {});
    logger.error("SSE MCPサーバーへの接続に失敗しました", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * タイムアウト用のPromise生成
 */
const createTimeout = (ms: number): Promise<never> =>
  new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `MCPサーバーへの接続がタイムアウトしました（${ms / 1000}秒）`,
        ),
      );
    }, ms);
  });

/**
 * SDK Tool型 → DB保存用のデータに変換
 */
const toMcpToolData = (tool: {
  name: string;
  description?: string;
  inputSchema?: unknown;
}): McpToolData => ({
  name: tool.name,
  description: tool.description ?? "",
  inputSchema: JSON.stringify(tool.inputSchema ?? {}),
});
