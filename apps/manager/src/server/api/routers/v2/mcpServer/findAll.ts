import "server-only";

import type { ProtectedContext } from "@/server/api/trpc";
import { OFFICIAL_ORGANIZATION_ID } from "@tumiki/db/server";

/**
 * MCPサーバーテンプレート一覧を取得
 *
 * 以下のテンプレートを返します（組織テンプレートを優先表示）：
 * 1. 現在の組織で作成されたカスタムテンプレート（全て）
 * 2. 公式組織に紐づく公開テンプレート
 *
 * フロントエンドのServerCardコンポーネントとの互換性のため、
 * mcpToolsをtoolsにマッピングしています。
 */
export const findAll = async ({ ctx }: { ctx: ProtectedContext }) => {
  const mcpServers = await ctx.db.mcpServerTemplate.findMany({
    where: {
      OR: [
        // 現在の組織のカスタムテンプレート（全て表示）
        {
          organizationId: ctx.currentOrg.id,
        },
        // 公式テンプレート（公開のもの）
        {
          organizationId: OFFICIAL_ORGANIZATION_ID,
          visibility: "PUBLIC",
        },
      ],
    },
    include: {
      mcpTools: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 組織テンプレートを優先表示（組織テンプレート → 公式テンプレートの順）
  const sortedServers = mcpServers.sort((a, b) => {
    const aIsOrg = a.organizationId === ctx.currentOrg.id;
    const bIsOrg = b.organizationId === ctx.currentOrg.id;
    if (aIsOrg && !bIsOrg) return -1;
    if (!aIsOrg && bIsOrg) return 1;
    return 0;
  });

  // ServerCardコンポーネントとの互換性のため、mcpToolsをtoolsにマッピング
  // isOrgTemplateフラグを追加（組織テンプレートの場合true）
  return sortedServers.map((server) => ({
    ...server,
    tools: server.mcpTools,
    isOrgTemplate: server.organizationId === ctx.currentOrg.id,
  }));
};
