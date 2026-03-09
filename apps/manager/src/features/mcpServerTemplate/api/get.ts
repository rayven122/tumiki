import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  GetMcpServerTemplateInput,
  GetMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート詳細取得実装（CE版）
 */
export const getMcpServerTemplate = async ({
  input,
  ctx,
}: {
  input: GetMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<GetMcpServerTemplateOutput> => {
  // 権限チェック（メンバー以上は閲覧可能）
  validateOrganizationAccess(ctx.currentOrg);

  // 組織スコープ: 自組織 + 公式のみ
  const organizationIds = [
    ctx.currentOrg.id,
    process.env.OFFICIAL_ORGANIZATION_ID,
  ].filter(Boolean) as string[];

  const template = await ctx.db.mcpServerTemplate.findFirst({
    where: {
      id: input.id,
      organizationId: { in: organizationIds },
    },
  });

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  return template;
};
