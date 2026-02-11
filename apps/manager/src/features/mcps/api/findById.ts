import { type PrismaTransactionClient, PiiMaskingMode } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

type FindByIdInput = {
  id: McpServerId;
  organizationId: string;
};

export const findById = async (
  tx: PrismaTransactionClient,
  input: FindByIdInput,
) => {
  const { id, organizationId } = input;

  const server = await tx.mcpServer.findUnique({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    include: {
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

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // 各テンプレートインスタンスのツールに isEnabled を追加
  // UI互換性のため piiMaskingEnabled を piiMaskingMode から計算
  const piiMaskingEnabled = server.piiMaskingMode !== PiiMaskingMode.DISABLED;

  return {
    ...server,
    piiMaskingEnabled,
    dynamicSearch: server.dynamicSearch,
    templateInstances: server.templateInstances.map((instance) => {
      const allowedToolIds = new Set(
        instance.allowedTools.map((tool) => tool.id),
      );
      const tools = instance.mcpServerTemplate.mcpTools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        isEnabled: allowedToolIds.has(tool.id),
      }));
      return {
        id: instance.id,
        mcpServerTemplateId: instance.mcpServerTemplateId,
        isEnabled: instance.isEnabled,
        displayOrder: instance.displayOrder,
        mcpServerTemplate: instance.mcpServerTemplate,
        tools,
      };
    }),
  };
};
