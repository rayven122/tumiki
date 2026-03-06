// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OrganizationInvitationIdSchema } from "@/schema/ids";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { sendInvitationEmail } from "@/server/lib/mail";
import { generateInviteUrl } from "@/lib/url";

export const resendInvitationInputSchema = z.object({
  invitationId: OrganizationInvitationIdSchema,
});

export const resendInvitationOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  expires: z.date(),
});

export type ResendInvitationInput = z.infer<typeof resendInvitationInputSchema>;
export type ResendInvitationOutput = z.infer<
  typeof resendInvitationOutputSchema
>;

/**
 * 招待を再送信する（EE版）
 *
 * @param input - 再送信する招待のID
 * @param ctx - 保護されたコンテキスト
 * @returns 更新された招待情報
 */
export const resendInvitation = async ({
  input,
  ctx,
}: {
  input: ResendInvitationInput;
  ctx: ProtectedContext;
}): Promise<ResendInvitationOutput> => {
  try {
    // チームの管理者権限を検証
    validateOrganizationAccess(ctx.currentOrg, {
      requireAdmin: true,
      requireTeam: true,
    });

    // トランザクションで処理
    const result = await ctx.db.$transaction(async (tx) => {
      // 既存の招待を取得
      const existingInvitation = await tx.organizationInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.currentOrg.id,
        },
      });

      if (!existingInvitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "招待が見つかりません。",
        });
      }

      // 新しい有効期限を設定（7日後）
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      // 新しいトークンを生成
      const newToken = createId();

      // 招待を更新（新しいトークンと有効期限）
      const updatedInvitation = await tx.organizationInvitation.update({
        where: {
          id: input.invitationId,
        },
        data: {
          token: newToken,
          expires,
          invitedBy: ctx.session.user.id, // 再招待者を更新
        },
        include: {
          organization: true,
          invitedByUser: true,
        },
      });

      return updatedInvitation;
    });

    // メール送信処理（トランザクション外で実行）
    const inviteUrl = generateInviteUrl(result.token);

    await sendInvitationEmail(
      result.email,
      inviteUrl,
      result.organization.name,
      result.roles,
      result.expires.toISOString(),
    );

    return {
      id: result.id,
      email: result.email,
      expires: result.expires,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("招待再送信エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待の再送信中にエラーが発生しました。",
    });
  }
};
