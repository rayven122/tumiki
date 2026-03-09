import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  ListMcpServerTemplatesInput,
  ListMcpServerTemplatesOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート一覧取得実装（CE版）
 *
 * 組織スコープ: 自組織 + 公式のみ
 */
export const listMcpServerTemplates = async ({
  input,
  ctx,
}: {
  input: ListMcpServerTemplatesInput;
  ctx: ProtectedContext;
}): Promise<ListMcpServerTemplatesOutput> => {
  // 権限チェック（メンバー以上は閲覧可能）
  validateOrganizationAccess(ctx.currentOrg);

  // 組織スコープ: 自組織 + 公式のみ
  const organizationIds = [
    ctx.currentOrg.id,
    process.env.OFFICIAL_ORGANIZATION_ID,
  ].filter(Boolean) as string[];

  // フィルタ条件構築
  const where = {
    organizationId: { in: organizationIds },
    ...(input.transportType && { transportType: input.transportType }),
    ...(input.authType && { authType: input.authType }),
    ...(input.search && {
      OR: [
        { name: { contains: input.search, mode: "insensitive" as const } },
        {
          description: { contains: input.search, mode: "insensitive" as const },
        },
        {
          normalizedName: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(input.tags &&
      input.tags.length > 0 && {
        tags: { hasSome: input.tags },
      }),
  };

  const templates = await ctx.db.mcpServerTemplate.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
  });

  return templates;
};
