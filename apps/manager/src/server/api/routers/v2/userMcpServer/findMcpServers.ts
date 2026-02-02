import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus } from "@tumiki/db/prisma";

type FindMcpServersInput = {
  organizationId: string;
  userId: string;
};

export const findMcpServers = async (
  tx: PrismaTransactionClient,
  input: FindMcpServersInput,
) => {
  const { organizationId, userId } = input;

  // OAuthトークン一覧とサーバー一覧を並列で取得
  const [userOAuthTokens, servers] = await Promise.all([
    tx.mcpOAuthToken.findMany({
      where: { userId, organizationId },
      select: { mcpServerTemplateInstanceId: true },
    }),
    tx.mcpServer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        // 検証中（PENDING）のサーバーは除外（OAuth認証が中断された場合など）
        serverStatus: {
          not: ServerStatus.PENDING,
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
      include: {
        apiKeys: {
          where: {
            isActive: true,
            deletedAt: null,
          },
        },
        templateInstances: {
          orderBy: [{ displayOrder: "asc" }, { updatedAt: "asc" }],
          include: {
            mcpServerTemplate: {
              include: {
                mcpTools: true,
              },
            },
            allowedTools: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const authenticatedInstanceIds = new Set(
    userOAuthTokens.map((t) => t.mcpServerTemplateInstanceId),
  );

  return servers.map((server) => {
    // 各テンプレートインスタンスの情報を構築
    const templateInstances = server.templateInstances.map((instance) => {
      // ツールにisEnabledを追加
      const allowedToolIds = new Set(
        instance.allowedTools.map((tool) => tool.id),
      );
      const tools = instance.mcpServerTemplate.mcpTools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        mcpServerTemplateId: tool.mcpServerTemplateId,
        createdAt: tool.createdAt,
        updatedAt: tool.updatedAt,
        isEnabled: allowedToolIds.has(tool.id),
      }));

      // OAuth認証状態を追加
      const isOAuthRequired = instance.mcpServerTemplate.authType === "OAUTH";
      const isOAuthAuthenticated = isOAuthRequired
        ? authenticatedInstanceIds.has(instance.id)
        : null;

      return {
        id: instance.id,
        normalizedName: instance.normalizedName,
        mcpServerId: instance.mcpServerId,
        mcpServerTemplateId: instance.mcpServerTemplateId,
        isEnabled: instance.isEnabled,
        displayOrder: instance.displayOrder,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        mcpServerTemplate: instance.mcpServerTemplate,
        tools,
        isOAuthAuthenticated,
      };
    });

    // サーバー全体のOAuth状態（1つでも未認証があればfalse）
    const oauthInstances = templateInstances.filter(
      (i) => i.isOAuthAuthenticated !== null,
    );
    const allOAuthAuthenticated =
      oauthInstances.length > 0
        ? oauthInstances.every((i) => i.isOAuthAuthenticated === true)
        : null;

    return {
      ...server,
      templateInstances,
      allOAuthAuthenticated,
    };
  });
};
