// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OrganizationInvitationIdSchema } from "@/schema/ids";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";

export const cancelInvitationInputSchema = z.object({
  invitationId: OrganizationInvitationIdSchema,
});

export const cancelInvitationOutputSchema = z.object({
  success: z.boolean(),
});

export type CancelInvitationInput = z.infer<typeof cancelInvitationInputSchema>;
export type CancelInvitationOutput = z.infer<
  typeof cancelInvitationOutputSchema
>;

/**
 * 招待をキャンセルする（EE版）
 *
 * @param input - キャンセルする招待のID
 * @param ctx - 保護されたコンテキスト
 * @returns キャンセル結果
 */
export const cancelInvitation = async ({
  input,
  ctx,
}: {
  input: CancelInvitationInput;
  ctx: ProtectedContext;
}): Promise<CancelInvitationOutput> => {
  try {
    // チームの管理者権限を検証
    validateOrganizationAccess(ctx.currentOrg, {
      requireAdmin: true,
      requireTeam: true,
    });

    // トランザクションで処理
    await ctx.db.$transaction(async (tx) => {
      // 招待が存在するか確認
      const invitation = await tx.organizationInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.currentOrg.id,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "招待が見つかりません。",
        });
      }

      // 招待を削除
      await tx.organizationInvitation.delete({
        where: {
          id: input.invitationId,
        },
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("招待キャンセルエラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待のキャンセル中にエラーが発生しました。",
    });
  }
};
