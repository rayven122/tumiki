/**
 * チャット用MCPツール
 *
 * DBからツール定義を取得し、AI SDK Tool形式に変換する。
 * ツール実行は callToolCommand を直接呼び出す。
 * agentMcpTools.ts と同じパターンで実装。
 */

import { jsonSchema, type Tool } from "ai";

import { db } from "@tumiki/db/server";

import { DYNAMIC_SEARCH_META_TOOLS } from "../execution/index.js";
import { callToolCommand } from "../mcp/commands/callTool/callToolCommand.js";
import { handleMetaTool } from "../mcp/commands/callTool/handleMetaTool.js";
import { logMcpRequest } from "../mcp/middleware/requestLogging/index.js";

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
  /** MCPサーバーID */
  mcpServerId: string;
  /** mcp-proxyに渡すツール名（プレフィックスなし） */
  mcpProxyToolName: string;
  /** AI SDK用の一意な完全ツール名（slug付き） */
  aiSdkToolName: string;
  /** 組織ID */
  organizationId: string;
  /** ユーザーID */
  userId: string;
  /** dynamicSearchのメタツールかどうか */
  isDynamicSearchMetaTool: boolean;
};

/**
 * AI SDK Tool.execute関数のオプション型
 * AI SDKがツール実行時に渡すコンテキスト情報を含む
 */
type ToolExecuteOptions = {
  /** AI SDKが生成したツール呼び出しID */
  toolCallId: string;
  abortSignal?: AbortSignal;
  messages?: unknown[];
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
      slug: true,
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
        const aiSdkToolName = `${server.slug}__${metaTool.name}`;

        tools[aiSdkToolName] = {
          description: metaTool.description ?? undefined,
          inputSchema: jsonSchema(metaTool.inputSchema),
          execute: createChatToolExecute({
            mcpServerId: server.id,
            mcpProxyToolName: metaTool.name,
            aiSdkToolName,
            organizationId,
            userId,
            isDynamicSearchMetaTool: true,
          }),
        };

        toolNames.push(aiSdkToolName);
      }
      continue;
    }

    // 通常モード: 各ツールのインスタンスnormalizedNameを使用
    for (const instance of server.templateInstances) {
      for (const tool of instance.allowedTools) {
        const mcpProxyToolName = `${instance.normalizedName}__${tool.name}`;
        const aiSdkToolName = `${server.slug}__${mcpProxyToolName}`;

        tools[aiSdkToolName] = {
          description: tool.description ?? undefined,
          inputSchema: jsonSchema(tool.inputSchema as Record<string, unknown>),
          execute: createChatToolExecute({
            mcpServerId: server.id,
            mcpProxyToolName,
            aiSdkToolName,
            organizationId,
            userId,
            isDynamicSearchMetaTool: false,
          }),
        };

        toolNames.push(aiSdkToolName);
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
 *
 * AI SDKのexecute関数は (args, options) の形式で呼び出される。
 * optionsにはtoolCallIdが含まれており、これをログに記録することで
 * チャットメッセージとMCPリクエストログを紐付け可能にする。
 */
const createChatToolExecute = (
  params: CreateChatToolExecuteParams,
): ((args: unknown, options: ToolExecuteOptions) => Promise<unknown>) => {
  const {
    mcpServerId,
    mcpProxyToolName,
    aiSdkToolName,
    organizationId,
    userId,
    isDynamicSearchMetaTool,
  } = params;

  return async (
    args: unknown,
    options: ToolExecuteOptions,
  ): Promise<unknown> => {
    const startTime = Date.now();
    const { toolCallId } = options;

    // ログ記録用の共通パラメータ
    const logParams = {
      mcpServerId,
      organizationId,
      userId,
      toolName: aiSdkToolName,
      toolCallId,
      requestBody: { name: mcpProxyToolName, arguments: args },
    };

    try {
      // メタツール（dynamicSearch）かどうかで処理を分岐
      const result = isDynamicSearchMetaTool
        ? await handleMetaTool(
            mcpProxyToolName,
            args,
            mcpServerId,
            organizationId,
            userId,
          )
        : await callToolCommand({
            mcpServerId,
            organizationId,
            fullToolName: mcpProxyToolName,
            args: args as Record<string, unknown>,
            userId,
            toolCallId,
          });

      // ログを非同期で記録（レスポンスをブロックしない）
      void logMcpRequest({
        ...logParams,
        durationMs: Date.now() - startTime,
        responseBody: result,
        httpStatus: 200,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // エラー時もログを記録
      void logMcpRequest({
        ...logParams,
        durationMs: Date.now() - startTime,
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
