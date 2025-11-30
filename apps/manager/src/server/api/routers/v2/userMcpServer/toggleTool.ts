import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import type { McpServerId, ToolId } from "@/schema/ids";

type ToggleToolInput = {
  userMcpServerId: McpServerId;
  toolId: ToolId;
  isEnabled: boolean;
  organizationId: string;
};

// ツールトグルのレスポンススキーマ
export const toggleToolOutputSchema = z.object({
  toolId: z.string(),
  isEnabled: z.boolean(),
});

export type ToggleToolOutput = z.infer<typeof toggleToolOutputSchema>;

export const toggleTool = async (
  tx: PrismaTransactionClient,
  input: ToggleToolInput,
): Promise<ToggleToolOutput> => {
  const { userMcpServerId, toolId, isEnabled, organizationId } = input;

  // サーバーの存在確認
  const server = await tx.mcpServer.findUnique({
    where: {
      id: userMcpServerId,
      organizationId,
      deletedAt: null,
    },
    include: {
      allowedTools: true,
    },
  });

  if (!server) {
    throw new Error("サーバーが見つかりません");
  }

  // ツールの存在確認
  const tool = await tx.mcpTool.findUnique({
    where: {
      id: toolId,
    },
  });

  if (!tool) {
    throw new Error("ツールが見つかりません");
  }

  if (isEnabled) {
    // ツールを有効化（allowedToolsに追加）
    await tx.mcpServer.update({
      where: {
        id: userMcpServerId,
      },
      data: {
        allowedTools: {
          connect: {
            id: toolId,
          },
        },
      },
    });
  } else {
    // ツールを無効化（allowedToolsから削除）
    await tx.mcpServer.update({
      where: {
        id: userMcpServerId,
      },
      data: {
        allowedTools: {
          disconnect: {
            id: toolId,
          },
        },
      },
    });
  }

  return {
    toolId,
    isEnabled,
  };
};
