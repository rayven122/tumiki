import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "../../trpc";
import { UserMcpServerInstanceIdSchema } from "@/schema/ids";

const updateDisplayOrderSchema = z.object({
  updates: z.array(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      displayOrder: z.number().int().min(0),
    }),
  ),
});

type UpdateDisplayOrderInput = {
  input: z.infer<typeof updateDisplayOrderSchema>;
  ctx: ProtectedContext;
};

export const updateDisplayOrder = async ({
  input,
  ctx,
}: UpdateDisplayOrderInput) => {
  const { updates } = input;
  const userId = ctx.session.user.id;

  // すべての更新対象がユーザーの個人用サーバーか確認
  const serverIds = updates.map((update) => update.id);
  const servers = await ctx.db.userMcpServerInstance.findMany({
    where: {
      id: { in: serverIds },
      userId,
      deletedAt: null,
      organizationId: null, // 個人のMCPサーバーのみ更新可能
    },
    select: { id: true },
  });

  if (servers.length !== serverIds.length) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "更新する権限がありません",
    });
  }

  // 各サーバーの表示順序を更新
  await ctx.db.$transaction(
    updates.map((update) =>
      ctx.db.userMcpServerInstance.update({
        where: {
          id: update.id,
          userId,
        },
        data: {
          displayOrder: update.displayOrder,
        },
      }),
    ),
  );

  return { success: true };
};

export { updateDisplayOrderSchema };
