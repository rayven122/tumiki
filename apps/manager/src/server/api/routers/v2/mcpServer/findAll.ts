import "server-only";

import type { ProtectedContext } from "@/server/api/trpc";
import { OFFICIAL_ORGANIZATION_ID } from "@tumiki/db/server";

/**
 * 公開MCPサーバーテンプレート一覧を取得
 *
 * 公式組織に紐づく公開テンプレート（OFFICIAL_ORGANIZATION_ID）のみを返します。
 * フロントエンドのServerCardコンポーネントとの互換性のため、
 * mcpToolsをtoolsにマッピングしています。
 */
export const findAll = async ({ ctx }: { ctx: ProtectedContext }) => {
  const mcpServers = await ctx.db.mcpServerTemplate.findMany({
    where: {
      visibility: "PUBLIC",
      organizationId: OFFICIAL_ORGANIZATION_ID, // 公式組織のテンプレートのみ
    },
    include: {
      mcpTools: true,
    },
  });

  // ServerCardコンポーネントとの互換性のため、mcpToolsをtoolsにマッピング
  return mcpServers.map((server) => ({
    ...server,
    tools: server.mcpTools,
  }));
};
