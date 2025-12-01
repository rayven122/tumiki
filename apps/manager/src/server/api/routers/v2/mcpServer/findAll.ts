import "server-only";

import type { ProtectedContext } from "@/server/api/trpc";

/**
 * 公開MCPサーバーテンプレート一覧を取得
 *
 * グローバルな公開テンプレート（organizationId が null）のみを返します。
 * フロントエンドのServerCardコンポーネントとの互換性のため、
 * mcpToolsをtoolsにマッピングしています。
 */
export const findAll = async ({ ctx }: { ctx: ProtectedContext }) => {
  const mcpServers = await ctx.db.mcpServerTemplate.findMany({
    where: {
      visibility: "PUBLIC",
      organizationId: null, // グローバル共通テンプレートのみ
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
