// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  UpdateMcpServerTemplateInput,
  UpdateMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート更新実装（EE版）
 *
 * セキュリティ:
 * - システム管理者のみ実行可能
 * - 自組織のテンプレートのみ更新可能
 */
export const updateMcpServerTemplate = async ({
  input,
  ctx,
}: {
  input: UpdateMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<UpdateMcpServerTemplateOutput> => {
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

  // 3. テンプレート存在チェック（自組織のみ）
  const existing = await ctx.db.mcpServerTemplate.findFirst({
    where: {
      id: input.id,
      organizationId: ctx.currentOrg.id,
    },
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "MCPサーバーテンプレートが見つかりません",
    });
  }

  // 4. normalizedName重複チェック（変更時のみ）
  if (
    input.normalizedName &&
    input.normalizedName !== existing.normalizedName
  ) {
    const duplicate = await ctx.db.mcpServerTemplate.findUnique({
      where: {
        normalizedName_organizationId: {
          normalizedName: input.normalizedName,
          organizationId: ctx.currentOrg.id,
        },
      },
    });

    if (duplicate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "同じ識別子のテンプレートが既に存在します",
      });
    }
  }

  // 5. テンプレート更新
  const template = await ctx.db.mcpServerTemplate.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.normalizedName !== undefined && {
        normalizedName: input.normalizedName,
      }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.iconPath !== undefined && { iconPath: input.iconPath }),
      ...(input.transportType !== undefined && {
        transportType: input.transportType,
      }),
      ...(input.command !== undefined && { command: input.command }),
      ...(input.args !== undefined && { args: input.args }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.envVarKeys !== undefined && { envVarKeys: input.envVarKeys }),
      ...(input.authType !== undefined && { authType: input.authType }),
      ...(input.oauthProvider !== undefined && {
        oauthProvider: input.oauthProvider,
      }),
      ...(input.oauthScopes !== undefined && {
        oauthScopes: input.oauthScopes,
      }),
      ...(input.useCloudRunIam !== undefined && {
        useCloudRunIam: input.useCloudRunIam,
      }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
    },
  });

  return template;
};
