import { db } from "@tumiki/db/server";
import { connectToMcpServer } from "./mcpConnection.js";
import { logError, logInfo } from "../libs/logger/index.js";
import { updateRequestLoggingContext } from "../middleware/requestLogging/context.js";
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
): Promise<unknown> => {
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

    // 4. transportType を logging context に追加
    updateRequestLoggingContext({
      method: "tools/call",
      transportType: template.transportType,
      toolName: fullToolName,
    });

    const tool = template.mcpTools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${instanceName}__${toolName}`);
    }

    // 5. McpConfig（環境変数設定）を取得
    // ユーザー個別設定
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
    // TODO: ユーザ個別設定がない場合は、組織共通設定を利用する
    // ユーザー個別設定 > 組織共通設定 の優先順位で取得

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

    return result;
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

    // ログコンテキストにエラー情報を記録（インシデント追跡用）
    updateRequestLoggingContext({
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
export const getAllowedTools = async (
  mcpServerId: string,
): Promise<
  Array<{
    name: string;
    description: string | null;
    inputSchema: Record<string, unknown>;
  }>
> => {
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
    const tools = mcpServer.templateInstances.flatMap((instance) =>
      instance.allowedTools.map((tool) => ({
        name: `${instance.normalizedName}__${tool.name}`,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
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
