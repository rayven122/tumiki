import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { NotificationPrioritySchema } from "@tumiki/db/zod";

export const getNotificationsInputSchema = z.object({
  cursor: z.string().optional(), // カーソルベースのページネーション
  limit: z.number().int().min(1).max(100).default(20),
  isRead: z.boolean().optional(), // フィルター: 未読/既読/全て
  type: z.string().optional(), // タイプフィルター（文字列）
});

export const getNotificationsOutputSchema = z.object({
  notifications: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      priority: NotificationPrioritySchema,
      title: z.string(),
      message: z.string(),
      linkUrl: z.string().nullable(),
      isRead: z.boolean(),
      readAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      organizationId: z.string(),
      userId: z.string(),
      triggeredById: z.string().nullable(),
      isDeleted: z.boolean(),
      expiresAt: z.date().nullable(),
      triggeredBy: z
        .object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string().nullable(),
          image: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  nextCursor: z.string().optional(),
});

export type GetNotificationsInput = z.infer<typeof getNotificationsInputSchema>;
export type GetNotificationsOutput = z.infer<
  typeof getNotificationsOutputSchema
>;

export const getNotifications = async ({
  input,
  ctx,
}: {
  input: GetNotificationsInput;
  ctx: ProtectedContext;
}): Promise<GetNotificationsOutput> => {
  const { cursor, limit, isRead, type } = input;

  // WHERE条件の構築
  const where = {
    userId: ctx.session.user.id,
    organizationId: ctx.currentOrg.id,
    isDeleted: false,
    ...(isRead !== undefined && { isRead }),
    ...(type && { type }),
  };

  // 通知一覧を取得（カーソルベース）
  const notifications = await ctx.db.notification.findMany({
    where,
    take: limit + 1, // nextCursor判定のため+1件取得
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: [
      { isRead: "asc" }, // 未読を優先
      { createdAt: "desc" }, // 新しい順
    ],
    include: {
      triggeredBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  // nextCursor判定
  let nextCursor: string | undefined;
  if (notifications.length > limit) {
    const nextItem = notifications.pop(); // 最後の要素を削除
    nextCursor = nextItem?.id;
  }

  return {
    notifications,
    nextCursor,
  };
};
