/**
 * 統合MCPエンドポイント用ツール実行サービス
 *
 * 3階層ツール名をパースし、対象のMCPサーバーでツールを実行
 */

import { db, type PiiMaskingMode } from "@tumiki/db/server";
import { parseUnifiedToolName } from "./toolNameParser.js";
import { connectToMcpServer } from "../mcpConnection.js";
import { logError, logInfo } from "../../libs/logger/index.js";
import { updateExecutionContext } from "../../middleware/requestLogging/context.js";
import {
  extractMcpErrorInfo,
  getErrorCodeName,
} from "../../libs/error/index.js";

/**
 * 統合エンドポイント経由でツールを実行
 *
 * 1. 3階層ツール名をパース
 * 2. 子サーバーのMcpConfigを取得
 * 3. 既存のconnectToMcpServer()で接続
 * 4. ツールを実行
 * 5. 結果を返却
 *
 * @param unifiedMcpServerId - 統合MCPサーバーID
 * @param organizationId - 組織ID
 * @param fullToolName - 3階層フォーマットのツール名
 * @param args - ツールの引数
 * @param userId - ユーザーID
 * @returns ツール実行結果
 */
export const executeUnifiedTool = async (
  unifiedMcpServerId: string,
  organizationId: string,
  fullToolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> => {
  try {
    // 1. 3階層ツール名をパース
    const { mcpServerId, instanceName, toolName } =
      parseUnifiedToolName(fullToolName);

    logInfo("Executing unified tool", {
      unifiedMcpServerId,
      mcpServerId,
      instanceName,
      toolName,
    });

    // 2. テンプレートインスタンスを取得（複合ユニークキーで直接取得）
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

    // 3. 組織IDの検証
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

    // 4. transportType と実際のmcpServerIdを実行コンテキストに追加
    updateExecutionContext({
      method: "tools/call",
      transportType: template.transportType,
      toolName: fullToolName,
      // 子サーバーのPII/TOON設定を適用
      piiMaskingMode: templateInstance.mcpServer.piiMaskingMode,
      piiInfoTypes: templateInstance.mcpServer.piiInfoTypes,
      toonConversionEnabled: templateInstance.mcpServer.toonConversionEnabled,
      // 統合エンドポイント用: 実際に使用されたMCPサーバーID
      actualMcpServerId: mcpServerId,
    });

    // ツールの存在確認
    const tool = template.mcpTools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${fullToolName}`);
    }

    // 5. McpConfig（環境変数設定）を取得
    const mcpConfig = await db.mcpConfig.findUnique({
      where: {
        mcpServerTemplateInstanceId_userId_organizationId: {
          mcpServerTemplateInstanceId: templateInstance.id,
          organizationId,
          userId,
        },
      },
      select: {
        id: true,
        envVars: true,
        mcpServerTemplateInstanceId: true,
        organizationId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 6. MCP サーバーに接続
    const client = await connectToMcpServer(
      template,
      userId,
      templateInstance.id,
      mcpConfig,
    );

    // 7. ツールを実行
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

    // 8. 接続をクローズ
    await client.close();

    logInfo("Unified tool executed successfully", {
      unifiedMcpServerId,
      mcpServerId,
      toolName,
      instanceName,
    });

    return result;
  } catch (error) {
    // MCPエラー情報を抽出
    const errorInfo = extractMcpErrorInfo(error);

    logError("Failed to execute unified tool", error as Error, {
      unifiedMcpServerId,
      fullToolName,
      errorCode: errorInfo.errorCode,
      errorCodeName: getErrorCodeName(errorInfo.errorCode),
      httpStatus: errorInfo.httpStatus,
    });

    // 実行コンテキストにエラー情報を記録
    updateExecutionContext({
      httpStatus: errorInfo.httpStatus,
      errorCode: errorInfo.errorCode,
      errorMessage: errorInfo.errorMessage,
      errorDetails: error,
    });

    throw new Error(
      `Failed to execute unified tool ${fullToolName}: ${errorInfo.errorMessage}`,
    );
  }
};

/**
 * 統合エンドポイント用の子サーバー設定を取得
 *
 * tools/call実行時に対象ツールが属するMCPサーバーのPII/TOON設定を取得
 *
 * @param mcpServerId - MCPサーバーID
 * @returns PII/TOON設定
 */
export const getChildServerSettings = async (
  mcpServerId: string,
): Promise<{
  piiMaskingMode: PiiMaskingMode;
  piiInfoTypes: string[];
  toonConversionEnabled: boolean;
}> => {
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
