import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAdminAccess } from "@/server/utils/organizationPermissions";
import { OrganizationIdSchema } from "@/schema/ids";
import { TRPCError } from "@trpc/server";

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
  // 管理者権限を検証
  await validateOrganizationAdminAccess(
    ctx.db,
    input.organizationId,
    ctx.session.user.id,
  );

  // 既存の招待を取得
  const existingInvitation = await ctx.db.organizationInvitation.findFirst({
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

  // 招待を更新（新しいトークンと有効期限）
  const updatedInvitation = await ctx.db.organizationInvitation.update({
    where: {
      id: input.invitationId,
    },
    data: {
      token: undefined, // これにより新しいトークンが生成される
      expires,
      invitedBy: ctx.session.user.id, // 再招待者を更新
    },
  });

  // TODO: ここでメール送信処理を実装
  // await sendInvitationEmail(updatedInvitation);

  return {
    id: updatedInvitation.id,
    email: updatedInvitation.email,
    expires: updatedInvitation.expires,
  };
};
