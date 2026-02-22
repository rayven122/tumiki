/**
 * ツール実行コマンド
 *
 * MCP サーバーに接続してツールを実行する
 */

import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";

import { parseNamespacedToolName } from "../../../../domain/values/namespacedToolName.js";
import {
  getTemplateInstanceWithTemplate,
  getMcpConfigForUser,
} from "../../../../infrastructure/db/repositories/toolRepository.js";
import { connectToMcpServer } from "../../../../infrastructure/mcp/mcpClientFactory.js";
import { TIMEOUT_CONFIG } from "../../../../shared/constants/config.js";
import {
  extractMcpErrorInfo,
  getErrorCodeName,
} from "../../../../shared/errors/index.js";
import { wrapMcpError } from "../../../../shared/errors/wrapMcpError.js";
import { logError, logInfo, logWarn } from "../../../../shared/logger/index.js";
import { updateExecutionContext } from "../../middleware/requestLogging/context.js";

/**
 * ツール実行コマンドの入力型
 */
export type CallToolCommand = {
  readonly mcpServerId: string;
  readonly organizationId: string;
  readonly fullToolName: string;
  readonly args: Record<string, unknown>;
  readonly userId: string;
  /** AIツール呼び出しID（AI SDKが生成、チャットメッセージとの紐付け用） */
  readonly toolCallId?: string;
};

/**
 * ツールを実行
 *
 * @param command - ツール実行コマンド
 * @returns ツール実行結果
 */
export const callToolCommand = async (
  command: CallToolCommand,
): Promise<unknown> => {
  const {
    mcpServerId,
    organizationId,
    fullToolName,
    args,
    userId,
    toolCallId,
  } = command;
  try {
    // 1. ツール名をパース
    const { instanceName, toolName } = parseNamespacedToolName(fullToolName);

    // 2. 複合ユニークキーでテンプレートインスタンスを直接取得
    const templateInstance = await getTemplateInstanceWithTemplate(
      mcpServerId,
      instanceName,
    );

    // 3. 組織IDの検証
    if (templateInstance.mcpServer.organizationId !== organizationId) {
      throw new Error(
        `Organization ID mismatch: expected ${organizationId}, got ${templateInstance.mcpServer.organizationId}`,
      );
    }

    const template = templateInstance.mcpServerTemplate;

    // 4. transportType を実行コンテキストに追加
    updateExecutionContext({
      method: "tools/call",
      transportType: template.transportType,
      toolName: fullToolName,
      toolCallId,
    });

    const tool = template.mcpTools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${instanceName}__${toolName}`);
    }

    // 5. McpConfig（環境変数設定）を取得
    // TODO: ユーザ個別設定がない場合は、組織共通設定を利用する
    // ユーザー個別設定 > 組織共通設定 の優先順位で取得
    const mcpConfig = await getMcpConfigForUser(
      templateInstance.id,
      organizationId,
      userId,
    );

    // 6. MCP サーバーに接続
    const client = await connectToMcpServer(
      template,
      userId,
      templateInstance.id,
      mcpConfig,
    );

    // 7. ツールを実行（タイムアウト付き）
    logInfo("Calling tool on MCP server", {
      toolName,
      instanceName,
      timeoutMs: TIMEOUT_CONFIG.MCP_TOOL_CALL_MS,
    });

    const toolCallPromise = client.callTool({
      name: toolName,
      arguments: args,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Tool execution timed out after ${TIMEOUT_CONFIG.MCP_TOOL_CALL_MS}ms`,
          ),
        );
      }, TIMEOUT_CONFIG.MCP_TOOL_CALL_MS);
    });

    let result: unknown;
    try {
      result = await Promise.race([toolCallPromise, timeoutPromise]);
    } catch (error) {
      // タイムアウトやエラー時も接続をクローズ
      try {
        await client.close();
      } catch (closeError) {
        logWarn("Failed to close MCP client after error", {
          closeError:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
        });
      }
      throw error;
    }

    // 8. 接続をクローズ
    await client.close();

    logInfo("Tool executed successfully", {
      toolName,
      instanceName,
    });

    return result;
  } catch (error) {
    // ReAuthRequiredError はそのまま伝播させる（401 レスポンス生成のため）
    if (error instanceof ReAuthRequiredError) {
      throw error;
    }

    // MCPエラー情報を抽出
    const errorInfo = extractMcpErrorInfo(error);

    logError("Failed to execute tool", error as Error, {
      mcpServerId,
      fullToolName,
      errorCode: errorInfo.errorCode,
      errorCodeName: getErrorCodeName(errorInfo.errorCode),
      httpStatus: errorInfo.httpStatus,
    });

    // 実行コンテキストにエラー情報を記録（インシデント追跡用）
    updateExecutionContext({
      httpStatus: errorInfo.httpStatus,
      errorCode: errorInfo.errorCode,
      errorMessage: errorInfo.errorMessage,
      errorDetails: error,
    });

    throw wrapMcpError(error, `Failed to execute tool ${fullToolName}`);
  }
};
