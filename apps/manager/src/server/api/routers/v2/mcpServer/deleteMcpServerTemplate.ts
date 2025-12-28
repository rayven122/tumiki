import "server-only";

import type { ProtectedContext } from "@/server/api/trpc";
import { OFFICIAL_ORGANIZATION_ID } from "@tumiki/db/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const deleteMcpServerTemplateInputSchema = z.object({
  templateId: z.string(),
});

export const deleteMcpServerTemplateOutputSchema = z.object({
  success: z.boolean(),
});

/**
 * 組織内のMCPサーバーテンプレートを削除
 *
 * - 公式テンプレートは削除不可
 * - 現在の組織のテンプレートのみ削除可能
 * - テンプレートを使用しているMCPサーバーが存在する場合は削除不可
 */
export const deleteMcpServerTemplate = async ({
  ctx,
  input,
}: {
  ctx: ProtectedContext;
  input: z.infer<typeof deleteMcpServerTemplateInputSchema>;
}) => {
  const { templateId } = input;

  // テンプレートを取得
  const template = await ctx.db.mcpServerTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      templateInstances: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  // 公式テンプレートは削除不可
  if (template.organizationId === OFFICIAL_ORGANIZATION_ID) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "公式テンプレートは削除できません",
    });
  }

  // 現在の組織のテンプレートのみ削除可能
  if (template.organizationId !== ctx.currentOrg.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "他の組織のテンプレートは削除できません",
    });
  }

  // テンプレートを使用しているMCPサーバーが存在する場合は削除不可
  if (template.templateInstances.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "このテンプレートを使用しているMCPサーバーが存在するため削除できません。先にMCPサーバーを削除してください。",
    });
  }

  // テンプレートを削除（関連するMcpToolも自動削除される）
  await ctx.db.mcpServerTemplate.delete({
    where: { id: templateId },
  });

  return { success: true };
};
