/**
 * MCP サーバーファクトリ
 *
 * MCP SDK Server インスタンスを生成し、全ハンドラーを登録する
 * コンポジションルートとして機能する
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { ReAuthErrorContainer } from "./commands/callTool/callToolHandler.js";
import { createCallToolHandler } from "./commands/callTool/callToolHandler.js";
import { createInitializeHandler } from "./queries/initialize/initializeHandler.js";
import { createListToolsHandler } from "./queries/listTools/listToolsHandler.js";

/**
 * MCP サーバー生成に必要な依存関係
 */
type McpServerDeps = {
  mcpServerId: string;
  organizationId: string;
  userId: string;
  reAuthErrorContainer: ReAuthErrorContainer;
};

/**
 * MCP サーバーインスタンスを生成
 *
 * Low-Level Server API を使用して、JSON-RPC 2.0 プロトコルを自動処理
 *
 * @param deps - 依存関係
 * @returns 構成済みの MCP Server インスタンス
 */
export const createMcpServer = (deps: McpServerDeps): Server => {
  const server = new Server(
    {
      name: "Tumiki MCP Proxy",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ハンドラー登録（SDKがバリデーションとJSON-RPC形式化を自動処理）
  server.setRequestHandler(InitializeRequestSchema, createInitializeHandler());
  server.setRequestHandler(
    ListToolsRequestSchema,
    createListToolsHandler(deps.mcpServerId),
  );
  server.setRequestHandler(
    CallToolRequestSchema,
    createCallToolHandler(
      deps.mcpServerId,
      deps.organizationId,
      deps.userId,
      deps.reAuthErrorContainer,
    ),
  );

  return server;
};
