import { db, OFFICIAL_ORGANIZATION_ID } from "@tumiki/db/server";
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

    // 2. McpServerから組織情報を取得
    const mcpServer = await db.mcpServer.findUnique({
      where: { id: mcpServerId },
      select: { organizationId: true },
    });

    if (!mcpServer) {
      throw new Error(`McpServer not found: ${mcpServerId}`);
    }

    // 3. 組織カスタムと公式を並列検索（Promise.all）
    const [customTemplate, officialTemplate] = await Promise.all([
      db.mcpServerTemplate.findUnique({
        where: {
          normalizedName_organizationId: {
            normalizedName: templateName,
            organizationId: mcpServer.organizationId,
          },
        },
        include: { mcpTools: true },
      }),
      db.mcpServerTemplate.findUnique({
        where: {
          normalizedName_organizationId: {
            normalizedName: templateName,
            organizationId: OFFICIAL_ORGANIZATION_ID,
          },
        },
        include: { mcpTools: true },
      }),
    ]);

    // 4. 組織カスタムを優先
    const template = customTemplate ?? officialTemplate;
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const tool = template.mcpTools.find(
      (t: { name: string }) => t.name === toolName,
    );
    if (!tool) {
      throw new Error(`Tool not found: ${templateName}__${toolName}`);
    }

    // mcpServerTemplateをtoolに設定（既存ロジックとの互換性）
    const toolWithTemplate = { ...tool, mcpServerTemplate: template };

    // 5. 認証タイプに応じて設定を取得
    let mcpConfig: {
      id: string;
      envVars: string;
      mcpServerTemplateId: string;
      organizationId: string;
      userId: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;

    // OAuth の場合は McpConfig は不要（直接 OAuthToken から取得）
    if (toolWithTemplate.mcpServerTemplate.authType === "API_KEY") {
      mcpConfig = await db.mcpConfig.findFirst({
        where: {
          mcpServerTemplateId: toolWithTemplate.mcpServerTemplate.id,
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

      if (!mcpConfig) {
        throw new Error(
          `API Key configuration not found for template ${templateName}`,
        );
      }
    } else if (toolWithTemplate.mcpServerTemplate.authType === "OAUTH") {
      // OAuth の場合は userId が必要
      if (!userId) {
        throw new Error(
          `User ID is required for OAuth authentication. Template: ${templateName}`,
        );
      }

      // OAuthToken の存在確認
      const oauthToken = await db.mcpOAuthToken.findFirst({
        where: {
          userId,
          oauthClient: {
            mcpServerTemplateId: toolWithTemplate.mcpServerTemplate.id,
          },
        },
      });

      if (!oauthToken) {
        throw new Error(
          `OAuth token not found for user ${userId} and template ${templateName}. Please authenticate first.`,
        );
      }

      // トークンの有効期限チェック
      if (oauthToken.expiresAt && oauthToken.expiresAt < new Date()) {
        throw new Error(
          `OAuth token expired for user ${userId} and template ${templateName}. Please re-authenticate.`,
        );
      }

      logInfo("OAuth token found and valid", {
        tokenId: oauthToken.id,
        userId,
        templateName,
        expiresAt: oauthToken.expiresAt,
      });

      // OAuth の場合は mcpConfig を null のまま（oauth-header-injector で userId から直接取得）
      // ダミーの mcpConfig を作成して userId を渡す
      mcpConfig = {
        id: `oauth-${oauthToken.id}`,
        envVars: "{}",
        mcpServerTemplateId: toolWithTemplate.mcpServerTemplate.id,
        organizationId,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 6. MCP サーバーに接続
    const client = await connectToMcpServer(
      toolWithTemplate.mcpServerTemplate,
      mcpConfig,
    );

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

    // ツール実行失敗時は、エラー内容に関係なく McpServer の serverStatus を ERROR に更新
    try {
      await db.mcpServer.update({
        where: { id: mcpServerId },
        data: { serverStatus: "ERROR" },
      });
      logInfo(
        "Updated McpServer status to ERROR due to tool execution failure",
        {
          mcpServerId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    } catch (updateError) {
      logError("Failed to update McpServer status", updateError as Error, {
        mcpServerId,
      });
    }

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
    // normalizedNameフィールドを直接使用（DBで正規化済み）
    const tools = mcpServer.allowedTools.map((tool) => ({
      name: `${tool.mcpServerTemplate.normalizedName}__${tool.name}`,
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
