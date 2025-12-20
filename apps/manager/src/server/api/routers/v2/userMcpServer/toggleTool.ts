import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import type { ToolId } from "@/schema/ids";
import { createNotification } from "../notification/createNotification";

type ToggleToolInput = {
  templateInstanceId: string;
  toolId: ToolId;
  isEnabled: boolean;
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
  userId: string,
  organizationId: string,
): Promise<ToggleToolOutput> => {
  const { templateInstanceId, toolId, isEnabled } = input;

  // テンプレートインスタンスの存在確認
  const templateInstance = await tx.mcpServerTemplateInstance.findUnique({
    where: {
      id: templateInstanceId,
    },
    include: {
      mcpServer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!templateInstance) {
    throw new Error("テンプレートインスタンスが見つかりません");
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
    await tx.mcpServerTemplateInstance.update({
      where: {
        id: templateInstanceId,
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
    await tx.mcpServerTemplateInstance.update({
      where: {
        id: templateInstanceId,
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

  // 組織の全メンバーに通知を作成
  const orgMembers = await tx.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const statusText = isEnabled ? "有効化" : "無効化";

  // 各メンバーに通知を作成
  for (const member of orgMembers) {
    await createNotification(tx, {
      type: "MCP_TOOL_CHANGED",
      priority: "NORMAL",
      title: `MCPツールが${statusText}されました`,
      message: `${templateInstance.mcpServer.name}の「${tool.name}」が${statusText}されました。`,
      linkUrl: `/${organizationId}/mcps/${templateInstance.mcpServer.id}`,
      userId: member.userId,
      organizationId,
      triggeredById: userId,
    });
  }

  return {
    toolId,
    isEnabled,
  };
};
