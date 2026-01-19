import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { db } from "@tumiki/db/server";
import { connectToMcpServer } from "./mcpConnection.js";
import { logError, logInfo } from "../libs/logger/index.js";
import { updateExecutionContext } from "../middleware/requestLogging/context.js";
import { extractMcpErrorInfo, getErrorCodeName } from "../libs/error/index.js";

/**
 * ツール名をパースして、インスタンス名とツール名を抽出
 *
 * @param fullToolName - "{インスタンス名}__{ツール名}" 形式のツール名
 * @returns { instanceName, toolName }
 */
const parseToolName = (
  fullToolName: string,
): { instanceName: string; toolName: string } => {
  const parts = fullToolName.split("__");

  if (parts.length !== 2) {
    throw new Error(
      `Invalid tool name format: ${fullToolName}. Expected format: "{instanceName}__{toolName}"`,
    );
  }

  return {
    instanceName: parts[0],
    toolName: parts[1],
  };
};

/**
 * ツールを実行
 *
 * @param mcpServerId - McpServer ID
 * @param organizationId - 組織ID
 * @param fullToolName - "{インスタンス名}__{ツール名}" 形式のツール名
 * @param args - ツールの引数
 * @param userId - ユーザーID
 * @returns ツール実行結果
 */
export const executeTool = async (
  mcpServerId: string,
  organizationId: string,
  fullToolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<CallToolResult> => {
  try {
    // 1. ツール名をパース
    const { instanceName, toolName } = parseToolName(fullToolName);

    // 2. 複合ユニークキーでテンプレートインスタンスを直接取得
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

    const template = templateInstance.mcpServerTemplate;

    // 4. transportType を実行コンテキストに追加
    updateExecutionContext({
      method: "tools/call",
      transportType: template.transportType,
      toolName: fullToolName,
    });

    const tool = template.mcpTools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${instanceName}__${toolName}`);
    }

    // 5. McpConfig（環境変数設定）を取得
    // TODO: ユーザ個別設定がない場合は、組織共通設定を利用する
    // ユーザー個別設定 > 組織共通設定 の優先順位で取得
    const mcpConfig = await db.mcpConfig.findUnique({
      where: {
        mcpServerTemplateInstanceId_userId_organizationId: {
          mcpServerTemplateInstanceId: templateInstance.id,
          organizationId,
          userId,
        },
      },
    });

    // 7. MCP サーバーに接続
    const client = await connectToMcpServer(
      template,
      userId,
      templateInstance.id,
      mcpConfig,
    );

    // 8. ツールを実行
    logInfo("Calling tool on MCP server", {
      toolName,
      instanceName,
    });

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    // 9. 接続をクローズ
    await client.close();

    logInfo("Tool executed successfully", {
      toolName,
      instanceName,
    });

    return result as CallToolResult;
  } catch (error) {
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

    throw new Error(
      `Failed to execute tool ${fullToolName}: ${errorInfo.errorMessage}`,
    );
  }
};

/**
 * McpServer の allowedTools を取得
 *
 * @param mcpServerId - McpServer ID
 * @returns ツールリスト（"{インスタンス名}__{ツール名}" 形式）
 */
export const getAllowedTools = async (mcpServerId: string): Promise<Tool[]> => {
  logInfo("Getting allowed tools", {
    mcpServerId,
  });

  try {
    // McpServer の templateInstances と allowedTools を取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      select: {
        templateInstances: {
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

    if (!mcpServer) {
      throw new Error(`McpServer not found: ${mcpServerId}`);
    }

    // 全テンプレートインスタンスからallowedToolsを集約
    // "{normalizedName}__{ツール名}" 形式でツールリストを返す
    // instance.normalizedNameを使用（インスタンスごとの識別子）
    const tools: Tool[] = mcpServer.templateInstances.flatMap((instance) =>
      instance.allowedTools.map((tool) => ({
        name: `${instance.normalizedName}__${tool.name}`,
        // SDK型では description は string | undefined だが、DBスキーマでは string | null
        description: tool.description ?? undefined,
        // SDK型では inputSchema.type: "object" が必須だが、DB値は Record<string, unknown>
        // MCPサーバーからの同期時に正しいスキーマが保存されているため as で型アサーション
        inputSchema: tool.inputSchema as Tool["inputSchema"],
      })),
    );

    logInfo("Retrieved allowed tools", {
      mcpServerId,
      toolCount: tools.length,
    });

    return tools;
  } catch (error) {
    logError("Failed to get allowed tools", error as Error, {
      mcpServerId,
    });

    throw new Error(
      `Failed to get allowed tools for server ${mcpServerId}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
