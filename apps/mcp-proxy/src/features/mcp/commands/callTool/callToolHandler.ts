/**
 * CallTool ハンドラー
 *
 * MCP SDK の CallToolRequest に対応するハンドラー
 * メタツールの判定と通常ツールの実行を振り分ける
 */

import type { ReAuthRequiredError } from "@tumiki/oauth-token-manager";

import { isMetaToolName } from "../../../execution/index.js";
import { isReAuthRequiredError } from "../../../../shared/errors/index.js";
import { callToolCommand } from "./callToolCommand.js";
import { handleMetaTool } from "./handleMetaTool.js";

/**
 * ツール実行結果の型
 */
type ToolCallResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
};

/**
 * ReAuthRequiredError を保存するためのコンテナ
 *
 * SDK の setRequestHandler 内で発生した ReAuthRequiredError を
 * 外側のハンドラーに伝達するために使用。
 * SDK は内部でエラーを JSON-RPC エラーに変換するため、
 * このコンテナを使用して 401 レスポンスを生成する。
 */
export type ReAuthErrorContainer = {
  error: ReAuthRequiredError | null;
  requestId: string | number | null;
};

/**
 * CallTool ハンドラーを生成
 *
 * @param mcpServerId - MCP サーバー ID
 * @param organizationId - 組織 ID
 * @param userId - ユーザー ID
 * @param reAuthErrorContainer - ReAuthRequiredError を保存するためのコンテナ
 * @returns CallToolRequest ハンドラー
 */
export const createCallToolHandler = (
  mcpServerId: string,
  organizationId: string,
  userId: string,
  reAuthErrorContainer: ReAuthErrorContainer,
) => {
  return async (request: {
    params: { name: string; arguments?: Record<string, unknown> };
  }) => {
    const { name: fullToolName, arguments: args } = request.params;

    try {
      // メタツールの処理
      if (isMetaToolName(fullToolName)) {
        return await handleMetaTool(
          fullToolName,
          args,
          mcpServerId,
          organizationId,
          userId,
        );
      }

      // 通常のツール実行
      const result = await callToolCommand({
        mcpServerId,
        organizationId,
        fullToolName,
        args: args ?? {},
        userId,
      });

      return result as ToolCallResult;
    } catch (error) {
      // ReAuthRequiredError をコンテナに保存し、SDK にはエラーを伝播させる
      // mcpRequestHandler 側で 401 レスポンスを生成する
      if (isReAuthRequiredError(error)) {
        reAuthErrorContainer.error = error;
        // リクエスト ID が利用可能な場合は保存（MCP SDK の型構造に依存）
        reAuthErrorContainer.requestId = null;
      }
      throw error;
    }
  };
};
