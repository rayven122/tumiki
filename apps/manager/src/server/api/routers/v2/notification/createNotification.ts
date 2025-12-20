import type { PrismaTransactionClient } from "@tumiki/db";
import type { NotificationPriority } from "@tumiki/db/prisma";

type CreateNotificationInput = {
  type: string;
  priority?: NotificationPriority;
  title: string;
  message: string;
  linkUrl?: string;
  userId: string;
  organizationId: string;
  triggeredById?: string;
  expiresAt?: Date;
};

/**
 * 通知を作成する内部関数（トランザクション対応）
 *
 * @param tx - Prismaトランザクションクライアント
 * @param input - 通知作成パラメータ
 */
export const createNotification = async (
  tx: PrismaTransactionClient,
  input: CreateNotificationInput,
): Promise<void> => {
  await tx.notification.create({
    data: {
      type: input.type,
      priority: input.priority ?? "NORMAL",
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl,
      userId: input.userId,
      organizationId: input.organizationId,
      triggeredById: input.triggeredById,
      expiresAt:
        input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // デフォルト30日後
    },
  });
};
