import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";
import type { ToolId } from "@/schema/ids";

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
  _userId: string,
  _organizationId: string,
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

  return {
    toolId,
    isEnabled,
  };
};
