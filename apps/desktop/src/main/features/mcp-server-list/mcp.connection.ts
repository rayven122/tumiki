/**
 * MCP接続確認ユーティリティ
 *
 * リモートMCPサーバー（Streamable HTTP / SSE）に接続し、
 * ツール一覧を取得して接続確認を行う。
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
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
 * transportを使ってMCPサーバーに接続し、ツール一覧を取得する共通処理
 */
const listToolsWithTransport = async (
  transport: Transport,
  errorLabel: string,
  url: string,
): Promise<McpToolData[]> => {
  const client = new Client({ name: "tumiki-desktop", version: "1.0.0" });
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `MCPサーバーへの接続がタイムアウトしました（${CONNECTION_TIMEOUT_MS / 1000}秒）`,
            ),
          );
        }, CONNECTION_TIMEOUT_MS);
      }),
    ]);

    // 正常完了時はタイマーをキャンセル
    clearTimeout(timeoutId);

    const { tools } = await client.listTools();
    await client.close();

    return tools.map(toMcpToolData);
  } catch (error) {
    clearTimeout(timeoutId);
    await client.close().catch(() => {});
    logger.error(errorLabel, {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Streamable HTTP MCPサーバーからツール一覧を取得
 */
export const listToolsHTTP = async (
  url: string,
  headers: Record<string, string>,
): Promise<McpToolData[]> => {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {
        ...headers,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
    },
  });

  return listToolsWithTransport(
    transport,
    "Streamable HTTP MCPサーバーへの接続に失敗しました",
    url,
  );
};

/**
 * SSE MCPサーバーからツール一覧を取得
 */
export const listToolsSSE = async (
  url: string,
  headers: Record<string, string>,
): Promise<McpToolData[]> => {
  const transport = new SSEClientTransport(new URL(url), {
    requestInit: { headers },
  });

  return listToolsWithTransport(
    transport,
    "SSE MCPサーバーへの接続に失敗しました",
    url,
  );
};

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
