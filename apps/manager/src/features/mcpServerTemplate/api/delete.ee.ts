// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  DeleteMcpServerTemplateInput,
  DeleteMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート削除実装（EE版）
 *
 * セキュリティ:
 * - システム管理者のみ実行可能
 * - 自組織のテンプレートのみ削除可能
 * - 依存関係チェック（templateInstancesが存在する場合は削除不可）
 */
export const deleteMcpServerTemplate = async ({
  input,
  ctx,
}: {
  input: DeleteMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<DeleteMcpServerTemplateOutput> => {
  // 1. 権限チェック: システム管理者のみ
  if (ctx.session.user.role !== "SYSTEM_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "システム管理者のみが実行できる操作です",
    });
  }

  // 2. 組織アクセス検証
  validateOrganizationAccess(ctx.currentOrg, {
    requireTeam: true,
  });

  // 3. テンプレート存在チェックと依存関係確認
  const template = await ctx.db.mcpServerTemplate.findFirst({
    where: {
      id: input.id,
      organizationId: ctx.currentOrg.id,
    },
    include: {
      _count: {
        select: {
          templateInstances: true,
        },
      },
    },
  });

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  // 4. 依存関係チェック
  if (template._count.templateInstances > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "このテンプレートは使用中のため削除できません",
    });
  }

  // 5. テンプレート削除
  await ctx.db.mcpServerTemplate.delete({
    where: { id: input.id },
  });

  return { success: true };
};
