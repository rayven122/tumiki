/**
 * 統合MCPエンドポイント用ツール実行サービス
 *
 * 3階層ツール名をパースし、対象のMCPサーバーでツールを実行
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { db, type PiiMaskingMode } from "@tumiki/db/server";
import { parseUnifiedToolName } from "./toolNameParser.js";
import { connectToMcpServer } from "../mcpConnection.js";
import { logError, logInfo } from "../../libs/logger/index.js";
import { updateExecutionContext } from "../../middleware/requestLogging/context.js";
import {
  extractMcpErrorInfo,
  getErrorCodeName,
} from "../../libs/error/index.js";

/** PII/TOON設定の型 */
type ServerSettings = {
  piiMaskingMode: PiiMaskingMode;
  piiInfoTypes: string[];
  toonConversionEnabled: boolean;
};

/**
 * 実行コンテキストにエラー情報を記録
 */
const recordError = (error: unknown, fullToolName: string): never => {
  const errorInfo = extractMcpErrorInfo(error);

  updateExecutionContext({
    httpStatus: errorInfo.httpStatus,
    errorCode: errorInfo.errorCode,
    errorMessage: errorInfo.errorMessage,
    errorDetails: error,
  });

  throw new Error(
    `Failed to execute unified tool ${fullToolName}: ${errorInfo.errorMessage}`,
  );
};

/**
 * エラーログを出力
 */
const logExecutionError = (
  error: unknown,
  unifiedMcpServerId: string,
  fullToolName: string,
): void => {
  const errorInfo = extractMcpErrorInfo(error);

  logError("Failed to execute unified tool", error as Error, {
    unifiedMcpServerId,
    fullToolName,
    errorCode: errorInfo.errorCode,
    errorCodeName: getErrorCodeName(errorInfo.errorCode),
    httpStatus: errorInfo.httpStatus,
  });
};

/**
 * 統合エンドポイント経由でツールを実行
 *
 * 処理フロー:
 * 1. 3階層ツール名をパース
 * 2. テンプレートインスタンスを取得・検証
 * 3. MCPサーバーに接続してツールを実行
 * 4. 結果を返却
 */
export const executeUnifiedTool = async (
  unifiedMcpServerId: string,
  organizationId: string,
  fullToolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<CallToolResult> => {
  try {
    // 3階層ツール名をパース
    const { mcpServerId, instanceName, toolName } =
      parseUnifiedToolName(fullToolName);

    logInfo("Executing unified tool", {
      unifiedMcpServerId,
      mcpServerId,
      instanceName,
      toolName,
    });

    // テンプレートインスタンスを取得（複合ユニークキーで直接取得）
    const templateInstance =
      await db.mcpServerTemplateInstance.findUniqueOrThrow({
        where: {
          mcpServerId_normalizedName: {
            mcpServerId,
            normalizedName: instanceName,
          },
        },
        include: {
          mcpServer: {
            select: {
              organizationId: true,
              deletedAt: true,
              piiMaskingMode: true,
              piiInfoTypes: true,
              toonConversionEnabled: true,
            },
          },
          mcpServerTemplate: {
            include: {
              mcpTools: true,
            },
          },
        },
      });

    // 組織IDの検証
    if (templateInstance.mcpServer.organizationId !== organizationId) {
      throw new Error(
        `Organization ID mismatch: expected ${organizationId}, got ${templateInstance.mcpServer.organizationId}`,
      );
    }

    // 論理削除されたサーバーはエラー
    if (templateInstance.mcpServer.deletedAt !== null) {
      throw new Error(`MCP server has been deleted: ${mcpServerId}`);
    }

    const template = templateInstance.mcpServerTemplate;

    // 実行コンテキストを更新
    updateExecutionContext({
      method: "tools/call",
      transportType: template.transportType,
      toolName: fullToolName,
      piiMaskingMode: templateInstance.mcpServer.piiMaskingMode,
      piiInfoTypes: templateInstance.mcpServer.piiInfoTypes,
      toonConversionEnabled: templateInstance.mcpServer.toonConversionEnabled,
      actualMcpServerId: mcpServerId,
    });

    // ツールの存在確認
    const tool = template.mcpTools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${fullToolName}`);
    }

    // McpConfig（環境変数設定）を取得
    const mcpConfig = await db.mcpConfig.findUnique({
      where: {
        mcpServerTemplateInstanceId_userId_organizationId: {
          mcpServerTemplateInstanceId: templateInstance.id,
          organizationId,
          userId,
        },
      },
    });

    // MCPサーバーに接続
    const client = await connectToMcpServer(
      template,
      userId,
      templateInstance.id,
      mcpConfig,
    );

    // ツールを実行
    logInfo("Calling tool on MCP server via unified endpoint", {
      unifiedMcpServerId,
      mcpServerId,
      toolName,
      instanceName,
    });

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    // 接続をクローズ
    await client.close();

    logInfo("Unified tool executed successfully", {
      unifiedMcpServerId,
      mcpServerId,
      toolName,
      instanceName,
    });

    return result as CallToolResult;
  } catch (error) {
    logExecutionError(error, unifiedMcpServerId, fullToolName);
    // recordError は never を返す（常に throw する）ため、return で明示
    return recordError(error, fullToolName);
  }
};

/**
 * 統合エンドポイント用の子サーバー設定を取得
 *
 * tools/call実行時に対象ツールが属するMCPサーバーのPII/TOON設定を取得
 */
export const getChildServerSettings = async (
  mcpServerId: string,
): Promise<ServerSettings> => {
  const server = await db.mcpServer.findUniqueOrThrow({
    where: { id: mcpServerId },
    select: {
      piiMaskingMode: true,
      piiInfoTypes: true,
      toonConversionEnabled: true,
    },
  });

  return server;
};
