import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const deleteNotificationInputSchema = z.object({
  notificationId: z.string(),
});

export const deleteNotificationOutputSchema = z.object({
  success: z.boolean(),
});

export type DeleteNotificationInput = z.infer<
  typeof deleteNotificationInputSchema
>;
export type DeleteNotificationOutput = z.infer<
  typeof deleteNotificationOutputSchema
>;

export const deleteNotification = async ({
  input,
  ctx,
}: {
  input: DeleteNotificationInput;
  ctx: ProtectedContext;
}): Promise<DeleteNotificationOutput> => {
  const { notificationId } = input;

  // 権限チェック（削除済みを除外）
  const notification = await ctx.db.notification.findUnique({
    where: { id: notificationId },
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
    where: { id: notificationId },
    data: { isDeleted: true },
  });

  return { success: true };
};
