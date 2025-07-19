// Stripe関連の環境変数の型安全な管理
export const STRIPE_PRICE_IDS = {
  INDIVIDUAL: process.env.STRIPE_PRICE_ID_INDIVIDUAL || "price_dev_individual",
  TEAM: process.env.STRIPE_PRICE_ID_TEAM || "price_dev_team",
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE || "price_dev_enterprise",
} as const;

// 型安全な環境変数アクセス
export const getStripePriceId = (
  planType: "INDIVIDUAL" | "TEAM" | "ENTERPRISE",
): string => {
  const priceId = STRIPE_PRICE_IDS[planType];
  if (!priceId) {
    throw new Error(`Stripe価格IDが設定されていません: ${planType}`);
  }
  return priceId;
};

// Stripe設定の検証
export const validateStripeConfig = () => {
  const requiredVars = [
    { key: "STRIPE_SECRET_KEY", value: process.env.STRIPE_SECRET_KEY },
    { key: "STRIPE_WEBHOOK_SECRET", value: process.env.STRIPE_WEBHOOK_SECRET },
    {
      key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
  ];

  const missingVars = requiredVars.filter(({ value }) => !value);

  if (missingVars.length > 0) {
    const missingKeys = missingVars.map(({ key }) => key).join(", ");
    throw new Error(`必須のStripe環境変数が設定されていません: ${missingKeys}`);
  }

  return true;
};
