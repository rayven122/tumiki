import type { PrismaTransactionClient } from "@tumiki/db";
import type { NotificationPriority } from "@tumiki/db/prisma";
import { createManyNotifications } from "./createNotification";

/**
 * 通知タイプの定義
 */
type NotificationType =
  | "MCP_SERVER_ADDED"
  | "MCP_SERVER_DELETED"
  | "MCP_SERVER_STATUS_CHANGED"
  | "MCP_TOOL_CHANGED"
  | "ORGANIZATION_INVITATION_SENT"
  | "ORGANIZATION_INVITATION_ACCEPTED"
  // セキュリティアラート
  | "SECURITY_API_KEY_CREATED"
  | "SECURITY_API_KEY_DELETED"
  | "SECURITY_ROLE_CREATED"
  | "SECURITY_ROLE_DELETED"
  | "SECURITY_ROLE_ASSIGNED"
  | "SECURITY_ROLE_UNASSIGNED"
  | "SECURITY_MEMBER_REMOVED"
  | "SECURITY_PERMISSION_CHANGED";

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

/**
 * 組織のオーナー（作成者）のみに通知を作成する内部関数（トランザクション対応）
 * セキュリティアラートなど、オーナーにのみ通知すべき内容に使用
 *
 * 注意: OrganizationMemberにはroleフィールドがなく、ロールはKeycloak JWTで管理されているため、
 * 現時点では組織の作成者（createdBy）をオーナーとして扱います。
 * 将来、DBにロール情報を追加した場合は、Owner/Adminロールでフィルタリングするように拡張できます。
 *
 * @param tx - Prismaトランザクションクライアント
 * @param input - 通知作成パラメータ
 */
export const createAdminNotifications = async (
  tx: PrismaTransactionClient,
  input: CreateBulkNotificationsInput,
): Promise<void> => {
  // 組織情報を取得して作成者（オーナー）を特定
  const organization = await tx.organization.findUnique({
    where: { id: input.organizationId },
    select: { createdBy: true },
  });

  // 組織が見つからない、または作成者がいない場合は何もしない
  if (!organization?.createdBy) {
    return;
  }

  // オーナーのみに通知を作成
  await createManyNotifications(tx, [organization.createdBy], {
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
