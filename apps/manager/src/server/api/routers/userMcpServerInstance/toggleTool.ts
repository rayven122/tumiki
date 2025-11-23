import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { ToggleToolInput } from ".";

type ToggleToolInputProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof ToggleToolInput>;
};

/**
 * 新スキーマ：ツールのトグル（有効化/無効化）
 * - UserToolGroupTool削除
 * - McpServerとMcpToolの暗黙的多対多リレーションを使用
 * - connect/disconnect操作で管理
 */
export const toggleTool = async ({ ctx, input }: ToggleToolInputProps) => {
  const { instanceId, toolId, enabled } = input;

  // インスタンスの所有権確認
  const instance = await ctx.db.mcpServer.findUnique({
    where: {
      id: instanceId,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
  });

  if (!instance) {
    throw new Error("サーバーインスタンスが見つかりません");
  }

  // Prismaの暗黙的多対多リレーション操作
  await ctx.db.mcpServer.update({
    where: {
      id: instanceId,
    },
    data: {
      allowedTools: enabled
        ? {
            connect: { id: toolId },
          }
        : {
            disconnect: { id: toolId },
          },
    },
  });

  return { success: true };
};
