import { type Prisma } from "@prisma/client";

// カスタムバリデーション: UserIdまたはOrganizationIdのいずれか一つが必須
export const validateSubscriptionOwner = (
  data: Prisma.SubscriptionCreateInput | Prisma.SubscriptionUpdateInput,
) => {
  const hasUserId = "user" in data && data.user;
  const hasOrgId = "organization" in data && data.organization;

  if (!hasUserId && !hasOrgId) {
    throw new Error("Subscription must have either userId or organizationId");
  }

  if (hasUserId && hasOrgId) {
    throw new Error("Subscription cannot have both userId and organizationId");
  }

  return true;
};

// アクティブなサブスクリプションの重複チェック
export const checkDuplicateActiveSubscription = async (
  prisma: Prisma.TransactionClient,
  userId?: string,
  organizationId?: string,
) => {
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      OR: [
        userId ? { userId } : {},
        organizationId ? { organizationId } : {},
      ].filter((condition) => Object.keys(condition).length > 0),
      status: {
        in: ["active", "trialing", "incomplete"],
      },
    },
  });

  if (existingSubscription) {
    throw new Error("An active subscription already exists");
  }

  return true;
};
