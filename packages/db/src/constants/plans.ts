import { type PlanType } from "@prisma/client";

import { STRIPE_PRICE_IDS } from "./stripe.js";

export type PlanLimits = {
  mcpServers: number;
  apiCalls: number;
  teamMembers?: number;
  customServers: number;
};

export type PlanConstant = {
  type: PlanType;
  name: string;
  description: string;
  stripePriceId: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  limits: PlanLimits;
};

export const PLANS: Record<PlanType, PlanConstant> = {
  INDIVIDUAL: {
    type: "INDIVIDUAL",
    name: "プロプラン",
    description: "個人向けの高機能プラン",
    stripePriceId: STRIPE_PRICE_IDS.INDIVIDUAL,
    amount: 1980,
    currency: "jpy",
    interval: "month",
    features: [
      "無制限のMCPサーバー",
      "優先サポート",
      "APIアクセス",
      "高度な分析機能",
      "カスタムMCPサーバー作成",
    ],
    limits: {
      mcpServers: -1,
      apiCalls: 100000,
      customServers: 10,
    },
  },
  TEAM: {
    type: "TEAM",
    name: "チームプラン",
    description: "チーム向けのコラボレーション機能付きプラン",
    stripePriceId: STRIPE_PRICE_IDS.TEAM,
    amount: 4980,
    currency: "jpy",
    interval: "month",
    features: [
      "プロプランの全機能",
      "チームメンバー5名まで",
      "チーム管理機能",
      "アクティビティログ",
      "共有MCPサーバー",
      "ロールベースアクセス制御",
    ],
    limits: {
      mcpServers: -1,
      apiCalls: 500000,
      teamMembers: 5,
      customServers: 50,
    },
  },
  ENTERPRISE: {
    type: "ENTERPRISE",
    name: "エンタープライズプラン",
    description: "大規模チーム向けのカスタマイズ可能なプラン",
    stripePriceId: STRIPE_PRICE_IDS.ENTERPRISE,
    amount: 19800,
    currency: "jpy",
    interval: "month",
    features: [
      "チームプランの全機能",
      "無制限のチームメンバー",
      "SSO/SAML",
      "SLA保証",
      "専任サポート",
      "カスタム契約",
      "オンプレミス対応",
    ],
    limits: {
      mcpServers: -1,
      apiCalls: -1,
      teamMembers: -1,
      customServers: -1,
    },
  },
} as const;

export const getPlanByType = (type: PlanType): PlanConstant => {
  return PLANS[type];
};

export const getPlanByStripeId = (
  stripePriceId: string,
): PlanConstant | undefined => {
  return Object.values(PLANS).find(
    (plan) => plan.stripePriceId === stripePriceId,
  );
};
