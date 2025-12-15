import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { inviteMemberInput } from "@/server/utils/organizationSchemas";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { sendInvitationEmail, generateInviteUrl } from "@/server/lib/mail";

export const inviteMemberInputSchema = inviteMemberInput;

export const inviteMemberOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  expires: z.date(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberInput>;
export type InviteMemberOutput = z.infer<typeof inviteMemberOutputSchema>;

export const inviteMember = async ({
  input,
  ctx,
}: {
  input: InviteMemberInput;
  ctx: ProtectedContext;
}): Promise<InviteMemberOutput> => {
  try {
    // チームの管理者権限を検証
    validateOrganizationAccess(ctx.currentOrg, {
      requireAdmin: true,
      requireTeam: true,
    });

    // トランザクションで処理
    const result = await ctx.db.$transaction(async (tx) => {
      // 既存の招待をチェック
      const existingInvitation = await tx.organizationInvitation.findFirst({
        where: {
          email: input.email,
          organizationId: ctx.currentOrg.id,
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "このメールアドレスは既に招待されています",
        });
      }

      // 有効期限を設定（7日後）
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      // 新しいトークンを生成
      const token = createId();

      // 招待を作成
      const invitation = await tx.organizationInvitation.create({
        data: {
          organizationId: ctx.currentOrg.id,
          email: input.email,
          token,
          invitedBy: ctx.session.user.id,
          isAdmin: input.isAdmin,
          roleIds: input.roleIds,
          groupIds: input.groupIds,
          expires,
        },
        include: {
          organization: true,
        },
      });

      return invitation;
    });

    // メール送信処理（トランザクション外で実行）
    const inviteUrl = generateInviteUrl(result.token);

    await sendInvitationEmail(
      result.email,
      inviteUrl,
      result.organization.name,
      result.isAdmin,
      result.roleIds,
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
    console.error("招待作成エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待の作成中にエラーが発生しました。",
    });
  }
};
