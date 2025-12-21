import type { PrismaTransactionClient } from "@tumiki/db";
import type { NotificationPriority } from "@tumiki/db/prisma";

export type CreateManyNotificationsInput = {
  type: string;
  priority?: NotificationPriority;
  title: string;
  message: string;
  linkUrl?: string;
  organizationId: string;
  triggeredById?: string;
  expiresAt?: Date;
};

/**
 * 複数のユーザーに同じ通知を一括作成する内部関数（トランザクション対応）
 *
 * @param tx - Prismaトランザクションクライアント
 * @param userIds - 通知を送信するユーザーIDのリスト
 * @param input - 通知内容
 */
export const createManyNotifications = async (
  tx: PrismaTransactionClient,
  userIds: string[],
  input: CreateManyNotificationsInput,
): Promise<void> => {
  if (userIds.length === 0) return;

  await tx.notification.createMany({
    data: userIds.map((userId) => ({
      type: input.type,
      priority: input.priority ?? "NORMAL",
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl,
      userId,
      organizationId: input.organizationId,
      triggeredById: input.triggeredById,
      expiresAt:
        input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // デフォルト30日後
    })),
  });
};
