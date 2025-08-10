import type { z } from "zod";
import type { ProtectedContext } from "../../trpc";
import type { ToggleToolInput } from ".";

type ToggleToolInput = {
  ctx: ProtectedContext;
  input: z.infer<typeof ToggleToolInput>;
};

export const toggleTool = async ({ ctx, input }: ToggleToolInput) => {
  const { instanceId, toolId, userMcpServerConfigId, enabled } = input;

  // インスタンスの所有権確認
  const instance = await ctx.db.userMcpServerInstance.findUnique({
    where: {
      id: instanceId,
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
    include: {
      toolGroup: true,
    },
  });

  if (!instance || !instance.toolGroup) {
    throw new Error("サーバーインスタンスが見つかりません");
  }

  // トランザクション内で更新
  await ctx.db.$transaction(async (tx) => {
    if (enabled) {
      // ツールを有効化
      await tx.userToolGroupTool.create({
        data: {
          toolGroupId: instance.toolGroup.id,
          toolId,
          userMcpServerConfigId,
        },
      });
    } else {
      // ツールを無効化
      await tx.userToolGroupTool.deleteMany({
        where: {
          toolGroupId: instance.toolGroup.id,
          toolId,
          userMcpServerConfigId,
        },
      });
    }
  });

  return { success: true };
};
