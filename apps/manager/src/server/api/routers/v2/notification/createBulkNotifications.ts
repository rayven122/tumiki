import type { PrismaTransactionClient } from "@tumiki/db";
import type { NotificationPriority } from "@tumiki/db/prisma";

/**
 * 通知タイプの定義
 */
type NotificationType =
  | "MCP_SERVER_ADDED"
  | "MCP_SERVER_STATUS_CHANGED"
  | "MCP_TOOL_CHANGED"
  | "ORGANIZATION_INVITATION_SENT";

type CreateBulkNotificationsInput = {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  linkUrl?: string;
  organizationId: string;
  triggeredById?: string;
  expiresAt?: Date;
};

/**
 * 組織の全メンバーに通知を一括作成する内部関数（トランザクション対応）
 *
 * @param tx - Prismaトランザクションクライアント
 * @param input - 通知作成パラメータ
 */
export const createBulkNotifications = async (
  tx: PrismaTransactionClient,
  input: CreateBulkNotificationsInput,
): Promise<void> => {
  // 組織の全メンバーを取得
  const orgMembers = await tx.organizationMember.findMany({
    where: { organizationId: input.organizationId },
    select: { userId: true },
  });

  // メンバーが存在しない場合は何もしない
  if (orgMembers.length === 0) {
    return;
  }

  const now = new Date();
  const expiresAt =
    input.expiresAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // デフォルト30日後

  // バルクインサートで一括作成（N+1クエリ問題を回避）
  await tx.notification.createMany({
    data: orgMembers.map((member) => ({
      type: input.type,
      priority: input.priority ?? "NORMAL",
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl,
      userId: member.userId,
      organizationId: input.organizationId,
      triggeredById: input.triggeredById,
      expiresAt,
    })),
  });
};
