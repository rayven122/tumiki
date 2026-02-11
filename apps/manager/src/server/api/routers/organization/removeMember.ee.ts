// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { removeMemberInput } from "@/server/utils/organizationSchemas";
import { KeycloakOrganizationProvider } from "@tumiki/keycloak";
import { createBulkNotifications } from "@/features/notification";

export const removeMemberInputSchema = removeMemberInput;

export const removeMemberOutputSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  // isAdmin削除: JWTのrolesで判定
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RemoveMemberInput = z.infer<typeof removeMemberInput>;
export type RemoveMemberOutput = z.infer<typeof removeMemberOutputSchema>;

/**
 * メンバーを削除する（EE版）
 *
 * @param input - 削除するメンバーID
 * @param ctx - 保護されたコンテキスト
 * @returns 削除されたメンバー情報
 */
export const removeMember = async ({
  input,
  ctx,
}: {
  input: RemoveMemberInput;
  ctx: ProtectedContext;
}): Promise<RemoveMemberOutput> => {
  // メンバー削除権限を検証
  validateOrganizationAccess(ctx.currentOrg, {
    requirePermission: "member:remove",
    requireTeam: true,
  });

  // 削除対象メンバーを取得（ユーザー情報も含む）
  const targetMember = await ctx.db.organizationMember.findUnique({
    where: {
      id: input.memberId,
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!targetMember) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "対象のメンバーが見つかりません",
    });
  }

  // 現在の組織のメンバーか確認
  if (targetMember.organizationId !== ctx.currentOrg.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "このチームのメンバーではありません",
    });
  }

  // 組織の作成者は削除できない
  if (targetMember.userId === ctx.currentOrg.createdBy) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "組織の作成者は削除できません",
    });
  }

  // Keycloakからメンバーを削除
  const provider = KeycloakOrganizationProvider.fromEnv();
  const removeResult = await provider.removeMember({
    externalId: ctx.currentOrg.id, // Organization.idがKeycloak Group ID
    userId: targetMember.userId,
  });

  if (!removeResult.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Keycloakからのメンバー削除に失敗しました: ${removeResult.error}`,
    });
  }

  // DBからメンバーを削除
  const deletedMember = await ctx.db.organizationMember.delete({
    where: { id: input.memberId },
  });

  // セキュリティアラート: 全メンバーに通知（非同期で実行）
  const memberDisplayName =
    targetMember.user?.name ?? targetMember.user?.email ?? "不明";
  void createBulkNotifications(ctx.db, {
    type: "SECURITY_MEMBER_REMOVED",
    priority: "NORMAL",
    title: "メンバーが削除されました",
    message: `${memberDisplayName} さんがチームから削除されました`,
    organizationId: ctx.currentOrg.id,
    triggeredById: ctx.session.user.id,
  });

  return deletedMember;
};
