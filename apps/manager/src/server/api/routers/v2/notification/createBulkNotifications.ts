import type { PrismaTransactionClient } from "@tumiki/db";
import type { NotificationPriority } from "@tumiki/db/prisma";
import { createManyNotifications } from "./createNotification";

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

  const userIds = orgMembers.map((member) => member.userId);

  // createManyNotifications を使って一括作成
  await createManyNotifications(tx, userIds, {
    type: input.type,
    priority: input.priority,
    title: input.title,
    message: input.message,
    linkUrl: input.linkUrl,
    organizationId: input.organizationId,
    triggeredById: input.triggeredById,
    expiresAt: input.expiresAt,
  });
};
