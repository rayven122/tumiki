import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerType } from "@tumiki/db/prisma";

type FindOfficialServersInput = {
  organizationId: string;
};

export const findOfficialServers = async (
  tx: PrismaTransactionClient,
  input: FindOfficialServersInput,
) => {
  const { organizationId } = input;

  const officialServers = await tx.mcpServer.findMany({
    where: {
      serverType: ServerType.OFFICIAL,
      organizationId,
      deletedAt: null,
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
  });

  return officialServers.map((server) => {
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
      };
    });

    return {
      ...server,
      templateInstances,
    };
  });
};
