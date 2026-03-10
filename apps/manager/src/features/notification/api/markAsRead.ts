import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const markAsReadInputSchema = z.object({
  id: z.string(),
});

export const markAsReadOutputSchema = z.object({
  id: z.string(),
});

export type MarkAsReadInput = z.infer<typeof markAsReadInputSchema>;
export type MarkAsReadOutput = z.infer<typeof markAsReadOutputSchema>;

export const markAsRead = async ({
  input,
  ctx,
}: {
  input: MarkAsReadInput;
  ctx: ProtectedContext;
}): Promise<MarkAsReadOutput> => {
  const { id } = input;

  // 権限チェック: 自分の通知のみ既読可能（削除済みを除外）
  const notification = await ctx.db.notification.findUnique({
    where: { id },
    select: { userId: true, isDeleted: true },
  });

  if (!notification || notification.isDeleted) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "通知が見つかりません",
    });
  }

  if (notification.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "この通知にアクセスする権限がありません",
    });
  }

  await ctx.db.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { id };
};
