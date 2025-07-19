import { type Prisma } from "@prisma/client";

// カスタムバリデーション: UserIdまたはOrganizationIdのいずれか一つが必須
export const validateSubscriptionOwner = (data: {
  userId?: string | null;
  organizationId?: string | null;
}) => {
  const hasUserId = Boolean(data.userId);
  const hasOrgId = Boolean(data.organizationId);

  if (!hasUserId && !hasOrgId) {
    throw new Error(
      "サブスクリプションにはuserIdまたはorganizationIdが必要です",
    );
  }

  if (hasUserId && hasOrgId) {
    throw new Error(
      "サブスクリプションは個人または組織のいずれか一方のみに関連付けできます",
    );
  }

  return true;
};

// アクティブなサブスクリプションの重複チェック
export const checkDuplicateActiveSubscription = async (
  prisma: Prisma.TransactionClient,
  userId?: string,
  organizationId?: string,
) => {
  const whereConditions = [];
  if (userId) whereConditions.push({ userId });
  if (organizationId) whereConditions.push({ organizationId });

  if (whereConditions.length === 0) {
    throw new Error("UserIdまたはOrganizationIdが必要です");
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      OR: whereConditions,
      status: {
        in: ["active", "trialing", "incomplete"],
      },
    },
  });

  if (existingSubscription) {
    throw new Error("アクティブなサブスクリプションが既に存在します");
  }

  return true;
};
