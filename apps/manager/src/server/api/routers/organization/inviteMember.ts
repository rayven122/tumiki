import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createMailClient, sendInvitation } from "@tumiki/mailer";
import { inviteMemberInput } from "@/server/utils/organizationSchemas";

export const inviteMemberInputSchema = inviteMemberInput;

export const inviteMemberOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  expires: z.date(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberInput>;
export type InviteMemberOutput = z.infer<typeof inviteMemberOutputSchema>;

const INVITATION_MESSAGES = {
  EMAIL_SEND_FAILED: "招待メール送信に失敗しました:",
} as const;

/**
 * メールクライアントを初期化する
 */
function initializeMailClient() {
  return createMailClient({
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    from: process.env.FROM_EMAIL ?? "",
  });
}

/**
 * 招待URLを生成する
 */
function generateInviteUrl(token: string): string {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXTAUTH_URL
      : "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

/**
 * 招待メールを送信する（最適化版）
 */
async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
  organizationName: string,
  isAdmin = false,
  roleIds: string[] = [],
  expiresAt?: string,
): Promise<void> {
  try {
    initializeMailClient();

    // 役割情報を含むカスタマイズメッセージ
    const roleInfo = isAdmin
      ? "管理者として"
      : roleIds.length > 0
        ? `${roleIds.length}個の役割と共に`
        : "";

    const customName = roleInfo ? `${email}（${roleInfo}招待）` : email;

    await sendInvitation({
      email,
      name: customName,
      inviteUrl,
      appName: organizationName,
      expiresAt,
    });
  } catch (emailError: unknown) {
    console.error(INVITATION_MESSAGES.EMAIL_SEND_FAILED, emailError);
    // メール送信失敗でもユーザーには招待成功を返す
    // （グレースフルデグラデーション）
  }
}

export const inviteMember = async ({
  input,
  ctx,
}: {
  input: InviteMemberInput;
  ctx: ProtectedContext;
}): Promise<InviteMemberOutput> => {
  try {
    // 管理者権限を検証（最適化されたバージョン）
    if (!ctx.isCurrentOrganizationAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この操作を行う権限がありません",
      });
    }

    // トランザクションで処理
    const result = await ctx.db.$transaction(async (tx) => {
      // 既存の招待をチェック
      const existingInvitation = await tx.organizationInvitation.findFirst({
        where: {
          email: input.email,
          organizationId: ctx.currentOrganizationId,
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
          organizationId: ctx.currentOrganizationId,
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
