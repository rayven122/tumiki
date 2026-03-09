// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import type { ProtectedContext } from "@/server/api/trpc";
import type {
  CreateMcpServerTemplateInput,
  CreateMcpServerTemplateOutput,
} from "./schemas";

/**
 * MCPサーバーテンプレート作成実装（EE版）
 *
 * セキュリティ:
 * - システム管理者のみ実行可能
 * - コマンドホワイトリスト検証（スキーマレベルで実施済み）
 * - 重複チェック（normalizedName + organizationId）
 */
export const createMcpServerTemplate = async ({
  input,
  ctx,
}: {
  input: CreateMcpServerTemplateInput;
  ctx: ProtectedContext;
}): Promise<CreateMcpServerTemplateOutput> => {
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

  // 3. 重複チェック: normalizedName + organizationId
  const existing = await ctx.db.mcpServerTemplate.findUnique({
    where: {
      normalizedName_organizationId: {
        normalizedName: input.normalizedName,
        organizationId: ctx.currentOrg.id,
      },
    },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "同じ識別子のテンプレートが既に存在します",
    });
  }

  // 4. テンプレート作成
  const template = await ctx.db.mcpServerTemplate.create({
    data: {
      name: input.name,
      normalizedName: input.normalizedName,
      description: input.description ?? null,
      tags: input.tags,
      iconPath: input.iconPath ?? null,
      transportType: input.transportType,
      command: input.command ?? null,
      args: input.args,
      url: input.url ?? null,
      envVarKeys: input.envVarKeys,
      authType: input.authType,
      oauthProvider: input.oauthProvider ?? null,
      oauthScopes: input.oauthScopes,
      useCloudRunIam: input.useCloudRunIam,
      createdBy: ctx.session.user.id,
      visibility: input.visibility,
      organizationId: ctx.currentOrg.id,
    },
  });

  return template;
};
