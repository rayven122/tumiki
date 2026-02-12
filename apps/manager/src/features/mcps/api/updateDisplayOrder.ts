import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserMcpServerInstanceIdSchema } from "@/schema/ids";
import type { PrismaTransactionClient } from "@tumiki/db";

export const updateDisplayOrderInputSchema = z.object({
  updates: z.array(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      displayOrder: z.number().int().min(0),
    }),
  ),
});

export const updateDisplayOrderOutputSchema = z.object({
  success: z.boolean(),
});

type UpdateDisplayOrderInput = z.infer<typeof updateDisplayOrderInputSchema>;

export const updateDisplayOrder = async (
  tx: PrismaTransactionClient,
  input: UpdateDisplayOrderInput,
  organizationId: string,
) => {
  const { updates } = input;

  // すべての更新対象が現在の組織のサーバーか確認
  const serverIds = updates.map((update) => update.id);
  const servers = await tx.mcpServer.findMany({
    where: {
      id: { in: serverIds },
      organizationId,
      deletedAt: null,
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
  await Promise.all(
    updates.map((update) =>
      tx.mcpServer.update({
        where: {
          id: update.id,
          organizationId: organizationId,
        },
        data: {
          displayOrder: update.displayOrder,
        },
      }),
    ),
  );

  return { success: true };
};
