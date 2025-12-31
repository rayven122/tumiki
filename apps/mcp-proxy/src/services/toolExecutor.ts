import { db } from "@tumiki/db/server";
import { connectToMcpServer } from "./mcpConnection.js";
import { logError } from "../libs/logger/index.js";
import { updateExecutionContext } from "../middleware/requestLogging/context.js";
import { extractMcpErrorInfo, getErrorCodeName } from "../libs/error/index.js";

/**
 * ツール名をパースして、サーバータイプ・インスタンス名・ツール名を抽出
 *
 * @param fullToolName - "{インスタンス名}__{ツール名}" 形式（CUSTOM）、またはツール名のみ（OFFICIAL）
 * @returns { isOfficial, instanceName, toolName }
 */
const parseToolName = (
  fullToolName: string,
): { isOfficial: boolean; instanceName: string | null; toolName: string } => {
  // "__" が含まれない = OFFICIAL（非統合MCP）
  if (!fullToolName.includes("__")) {
    return {
      isOfficial: true,
      instanceName: null,
      toolName: fullToolName,
    };
  }

  // "__" が含まれる = CUSTOM（統合MCP）
  const parts = fullToolName.split("__");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid tool name format: ${fullToolName}. Expected format: "{instanceName}__{toolName}"`,
    );
  }

  return {
    isOfficial: false,
    instanceName: parts[0],
    toolName: parts[1],
  };
};

/**
 * テンプレートインスタンスを取得
 * CUSTOM: mcpServerTemplateInstance から複合ユニークキーで検索
 * OFFICIAL: mcpServer から findUnique でリレーション経由で取得（必ず1インスタンス）
 *
 * @param mcpServerId - McpServer ID
 * @param isOfficial - OFFICIALサーバーかどうか
 * @param instanceName - インスタンス名（CUSTOMの場合のみ）
 */
const getTemplateInstance = async (
  mcpServerId: string,
  isOfficial: boolean,
  instanceName: string | null,
) => {
  if (!isOfficial) {
    // CUSTOM: 複合ユニークキーで直接検索
    const result = await db.mcpServerTemplateInstance.findUniqueOrThrow({
      where: {
        mcpServerId_normalizedName: {
          mcpServerId,
          normalizedName: instanceName!,
        },
      },
      include: {
        mcpServer: { select: { organizationId: true } },
        mcpServerTemplate: { include: { mcpTools: true } },
      },
    });
    return {
      templateInstance: result,
      serverOrganizationId: result.mcpServer.organizationId,
    };
  }

  // OFFICIAL: mcpServer から findUnique でリレーション経由で取得
  const mcpServer = await db.mcpServer.findUniqueOrThrow({
    where: { id: mcpServerId },
    include: {
      templateInstances: {
        take: 1,
        include: {
          mcpServerTemplate: { include: { mcpTools: true } },
        },
      },
    },
  });

  const firstInstance = mcpServer.templateInstances[0];
  if (!firstInstance) {
    throw new Error(`No template instance found for McpServer: ${mcpServerId}`);
  }
  return {
    templateInstance: firstInstance,
    serverOrganizationId: mcpServer.organizationId,
  };
};

/**
 * ツールを実行
 *
 * @param mcpServerId - McpServer ID
 * @param organizationId - 組織ID
 * @param fullToolName - "{インスタンス名}__{ツール名}" 形式のツール名、またはOFFICIALの場合はツール名のみ
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
    // 1. ツール名をパース（OFFICIAL/CUSTOM を判定）
    const { isOfficial, instanceName, toolName } = parseToolName(fullToolName);

    // 2. テンプレートインスタンスを取得（1回のクエリ）
    const { templateInstance, serverOrganizationId } =
      await getTemplateInstance(mcpServerId, isOfficial, instanceName);

    // 3. 組織IDの検証
    if (serverOrganizationId !== organizationId) {
      throw new Error(
        `Organization ID mismatch: expected ${organizationId}, got ${serverOrganizationId}`,
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
      throw new Error(`Tool not found: ${toolName}`);
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

    // 6. MCP サーバーに接続
    const client = await connectToMcpServer(
      template,
      userId,
      templateInstance.id,
      mcpConfig,
    );

    // 7. ツールを実行
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    // 8. 接続をクローズ
    await client.close();

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
export const getAllowedTools = async (
  mcpServerId: string,
): Promise<
  Array<{
    name: string;
    description: string | null;
    inputSchema: Record<string, unknown>;
  }>
> => {
  try {
    // McpServer の serverType, templateInstances と allowedTools を取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      select: {
        serverType: true,
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
    // OFFICIAL（非統合MCP）: ツール名のみ
    // CUSTOM（統合MCP）: "{normalizedName}__{ツール名}" 形式
    const isOfficial = mcpServer.serverType === "OFFICIAL";
    const tools = mcpServer.templateInstances.flatMap((instance) =>
      instance.allowedTools.map((tool) => ({
        name: isOfficial
          ? tool.name
          : `${instance.normalizedName}__${tool.name}`,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      })),
    );

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
