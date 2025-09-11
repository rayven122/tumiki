import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAdminAccess } from "@/server/utils/organizationPermissions";
import { OrganizationIdSchema } from "@/schema/ids";
import { TRPCError } from "@trpc/server";
import { sendInvitationEmail } from "@/server/services/emailService";

export const resendInvitationInputSchema = z.object({
  organizationId: OrganizationIdSchema,
  invitationId: z.string(),
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

export const resendInvitation = async ({
  input,
  ctx,
}: {
  input: ResendInvitationInput;
  ctx: ProtectedContext;
}): Promise<ResendInvitationOutput> => {
  try {
    // 管理者権限を検証
    await validateOrganizationAdminAccess(
      ctx.db,
      input.organizationId,
      ctx.session.user.id,
    );

    // トランザクションで処理
    const result = await ctx.db.$transaction(async (tx) => {
      // 既存の招待を取得
      const existingInvitation = await tx.organizationInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: input.organizationId,
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
    try {
      await sendInvitationEmail({
        invitation: result,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${result.token}`,
      });
    } catch (emailError) {
      console.error("メール送信エラー:", emailError);
      // メール送信に失敗してもトランザクションはロールバックしない
      // ユーザーには警告を表示
    }

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
