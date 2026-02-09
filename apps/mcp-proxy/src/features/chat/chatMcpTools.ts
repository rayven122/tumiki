/**
 * チャット用MCPツール
 *
 * DBからツール定義を取得し、AI SDK Tool形式に変換する。
 * ツール実行は callToolCommand を直接呼び出す。
 * agentMcpTools.ts と同じパターンで実装。
 */

import { jsonSchema, type Tool } from "ai";

import { db } from "@tumiki/db/server";

import { callToolCommand } from "../mcp/commands/callTool/callToolCommand.js";
import { logMcpRequest } from "../mcp/middleware/requestLogging/index.js";
import {
  DYNAMIC_SEARCH_META_TOOLS,
  isMetaTool,
} from "../dynamicSearch/index.js";

/**
 * MCPツール取得のパラメータ
 */
type GetChatMcpToolsParams = {
  /** MCPサーバーIDの配列 */
  mcpServerIds: string[];
  /** 組織ID */
  organizationId: string;
  /** ユーザーID（認証情報取得用） */
  userId: string;
};

/**
 * MCPツール取得の結果
 */
type GetChatMcpToolsResult = {
  /** AI SDK Tool形式のツールオブジェクト */
  tools: Record<string, Tool>;
  /** ツール名の配列 */
  toolNames: string[];
};

/**
 * ツール実行関数作成用パラメータ
 */
type CreateChatToolExecuteParams = {
  mcpServerId: string;
  fullToolName: string;
  organizationId: string;
  userId: string;
};

/**
 * MCPツールエラーレスポンス
 */
type McpToolErrorResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
};

/**
 * チャット用のMCPツールをAI SDK形式で取得
 *
 * DBからツール定義を取得し、callToolCommandを使用してツール実行を行う。
 * agentMcpTools.ts と同じパターンで実装。
 *
 * @param params - ツール取得パラメータ
 * @returns AI SDK Tool形式のツール
 */
export const getChatMcpTools = async (
  params: GetChatMcpToolsParams,
): Promise<GetChatMcpToolsResult> => {
  const { mcpServerIds, organizationId, userId } = params;

  if (mcpServerIds.length === 0) {
    return { tools: {}, toolNames: [] };
  }

  // DBからMCPサーバーとツール定義を取得
  const servers = await db.mcpServer.findMany({
    where: {
      id: { in: mcpServerIds },
      deletedAt: null,
    },
    select: {
      id: true,
      dynamicSearch: true,
      templateInstances: {
        where: { isEnabled: true },
        select: {
          normalizedName: true,
          allowedTools: {
            select: {
              name: true,
              description: true,
              inputSchema: true,
            },
          },
        },
      },
    },
  });

  // AI SDK Tool形式に変換
  const tools: Record<string, Tool> = {};
  const toolNames: string[] = [];

  for (const server of servers) {
    // dynamicSearch有効時はメタツールを使用
    if (server.dynamicSearch) {
      for (const metaTool of DYNAMIC_SEARCH_META_TOOLS) {
        // ツール名: {mcpServerId}__{metaToolName}
        const fullToolName = `${server.id}__${metaTool.name}`;

        tools[fullToolName] = {
          description: metaTool.description ?? undefined,
          inputSchema: jsonSchema(
            metaTool.inputSchema as Record<string, unknown>,
          ),
          execute: createChatToolExecute({
            mcpServerId: server.id,
            fullToolName: metaTool.name, // mcp-proxyに渡すのはプレフィックスなし
            organizationId,
            userId,
          }),
        };

        toolNames.push(fullToolName);
      }
    } else {
      // 通常モード: 各ツールのインスタンスnormalizedNameを使用
      for (const instance of server.templateInstances) {
        for (const tool of instance.allowedTools) {
          // mcp-proxyに渡すツール名: {instanceNormalizedName}__{toolName}
          const proxyToolName = `${instance.normalizedName}__${tool.name}`;
          // AI SDK用の一意キー: {mcpServerId}__{proxyToolName}
          const fullToolName = `${server.id}__${proxyToolName}`;

          tools[fullToolName] = {
            description: tool.description ?? undefined,
            inputSchema: jsonSchema(
              tool.inputSchema as Record<string, unknown>,
            ),
            execute: createChatToolExecute({
              mcpServerId: server.id,
              fullToolName: proxyToolName,
              organizationId,
              userId,
            }),
          };

          toolNames.push(fullToolName);
        }
      }
    }
  }

  return { tools, toolNames };
};

/**
 * ツール実行関数を作成
 *
 * callToolCommandをラップし、実行時間を計測してログを記録する。
 * エラーはLLMに返す形式に変換する。
 */
const createChatToolExecute = (
  params: CreateChatToolExecuteParams,
): ((args: unknown) => Promise<unknown>) => {
  const { mcpServerId, fullToolName, organizationId, userId } = params;

  return async (args: unknown): Promise<unknown> => {
    const startTime = Date.now();
    const requestBody = { name: fullToolName, arguments: args };

    try {
      const result = await callToolCommand({
        mcpServerId,
        organizationId,
        fullToolName,
        args: args as Record<string, unknown>,
        userId,
      });

      const durationMs = Date.now() - startTime;

      // ログを非同期で記録（レスポンスをブロックしない）
      void logMcpRequest({
        mcpServerId,
        organizationId,
        userId,
        toolName: fullToolName,
        durationMs,
        requestBody,
        responseBody: result,
        httpStatus: 200,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // エラー時もログを記録
      void logMcpRequest({
        mcpServerId,
        organizationId,
        userId,
        toolName: fullToolName,
        durationMs,
        requestBody,
        responseBody: { error: errorMessage },
        httpStatus: 500,
        errorMessage,
      });

      // エラーをLLMに返す（isError: trueで表示）
      const errorResponse: McpToolErrorResponse = {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
      return errorResponse;
    }
  };
};
