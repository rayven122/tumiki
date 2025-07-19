import { PlanType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedPlans = async () => {
  const plans = [
    {
      name: "プロプラン",
      description: "個人向けの高機能プラン",
      stripePriceId: "price_dev_individual", // 開発用の仮ID
      amount: 1980,
      type: PlanType.INDIVIDUAL,
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
    {
      name: "チームプラン",
      description: "チーム向けのコラボレーション機能付きプラン",
      stripePriceId: "price_dev_team", // 開発用の仮ID
      amount: 4980,
      type: PlanType.TEAM,
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
    {
      name: "エンタープライズプラン",
      description: "大規模チーム向けのカスタマイズ可能なプラン",
      stripePriceId: "price_dev_enterprise", // 開発用の仮ID
      amount: 19800,
      type: PlanType.ENTERPRISE,
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
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      update: plan,
      create: plan,
    });
    console.log(`✅ Created/Updated plan: ${plan.name}`);
  }
};
