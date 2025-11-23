import { db } from "@tumiki/db/server";
import { connectToMcpServer } from "./mcpConnection.js";
import { logError, logInfo } from "../libs/logger/index.js";

/**
 * ツール名をパースして、Template名とツール名を抽出
 *
 * @param fullToolName - "{template名}__{ツール名}" 形式のツール名
 * @returns { templateName, toolName }
 */
const parseToolName = (
  fullToolName: string,
): { templateName: string; toolName: string } => {
  const parts = fullToolName.split("__");

  if (parts.length !== 2) {
    throw new Error(
      `Invalid tool name format: ${fullToolName}. Expected format: "{templateName}__{toolName}"`,
    );
  }

  return {
    templateName: parts[0],
    toolName: parts[1],
  };
};

/**
 * ツールを実行
 *
 * @param mcpServerId - McpServer ID
 * @param organizationId - 組織ID
 * @param fullToolName - "{template名}__{ツール名}" 形式のツール名
 * @param args - ツールの引数
 * @param userId - ユーザーID（オプション）
 * @returns ツール実行結果
 */
export const executeTool = async (
  mcpServerId: string,
  organizationId: string,
  fullToolName: string,
  args: Record<string, unknown>,
  userId?: string,
): Promise<unknown> => {
  logInfo("Executing tool", {
    mcpServerId,
    fullToolName,
  });

  try {
    // 1. ツール名をパース
    const { templateName, toolName } = parseToolName(fullToolName);

    // 2. McpServerTemplate と McpTool を検索
    const tool = await db.mcpTool.findFirst({
      where: {
        name: toolName,
        mcpServerTemplate: { name: templateName },
      },
      include: {
        mcpServerTemplate: true,
      },
    });

    if (!tool || !tool.mcpServerTemplate) {
      throw new Error(
        `Tool not found: ${templateName}__${toolName}. Please verify the tool name.`,
      );
    }

    // 3. McpConfigを取得（userId優先、なければorganizationId）
    const mcpConfig = await db.mcpConfig.findFirst({
      where: {
        mcpServerTemplateId: tool.mcpServerTemplate.id,
        organizationId,
        OR: [...(userId ? [{ userId }] : []), { userId: null }],
      },
      orderBy: {
        userId: "desc", // userIdがnullでないレコードを優先
      },
      select: {
        id: true,
        envVars: true,
        mcpServerTemplateId: true,
        organizationId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 4. MCP サーバーに接続
    const client = await connectToMcpServer(tool.mcpServerTemplate, mcpConfig);

    try {
      // 5. ツールを実行（元のツール名で実行）
      logInfo("Calling tool on MCP server", {
        toolName,
        templateName,
      });

      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      logInfo("Tool executed successfully", {
        toolName,
        templateName,
      });

      return result;
    } finally {
      // 6. 接続をクローズ
      await client.close();
    }
  } catch (error) {
    logError("Failed to execute tool", error as Error, {
      mcpServerId,
      fullToolName,
    });

    throw new Error(
      `Failed to execute tool ${fullToolName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * McpServer の allowedTools を取得
 *
 * @param mcpServerId - McpServer ID
 * @returns ツールリスト（"{template名}__{ツール名}" 形式）
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
    // McpServer の allowedTools を取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      include: {
        allowedTools: {
          include: {
            mcpServerTemplate: true,
          },
        },
      },
    });

    if (!mcpServer) {
      throw new Error(`McpServer not found: ${mcpServerId}`);
    }

    // "{template名}__{ツール名}" 形式でツールリストを返す
    const tools = mcpServer.allowedTools.map((tool) => ({
      name: `${tool.mcpServerTemplate.name}__${tool.name}`,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
    }));

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
