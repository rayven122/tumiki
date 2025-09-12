import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createMailClient, sendInvitation } from "@tumiki/mailer";

export const resendInvitationInputSchema = z.object({
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

const RESEND_MESSAGES = {
  EMAIL_SEND_FAILED: "招待再送信メール送信に失敗しました:",
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
  const baseUrl = process.env.NODE_ENV === "production"
    ? process.env.NEXTAUTH_URL
    : "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
}

/**
 * 招待再送信メールを送信する（最適化版）
 */
async function sendResendInvitationEmail(
  email: string,
  inviteUrl: string,
  organizationName: string,
  isAdmin = false,
  roleIds: string[] = [],
  expiresAt?: string,
): Promise<void> {
  try {
    initializeMailClient();
    
    // 再送信であることを明記し、役割情報も含む
    const roleInfo = isAdmin 
      ? "管理者として" 
      : roleIds.length > 0 
        ? `${roleIds.length}個の役割と共に` 
        : "";
    
    const customName = roleInfo 
      ? `${email}（${roleInfo}再招待）`
      : `${email}（再招待）`;
    
    await sendInvitation({
      email,
      name: customName,
      inviteUrl,
      appName: organizationName,
      expiresAt,
    });
  } catch (emailError: unknown) {
    console.error(RESEND_MESSAGES.EMAIL_SEND_FAILED, emailError);
    // メール送信失敗でもユーザーには再送信成功を返す
    // （グレースフルデグラデーション）
  }
}

export const resendInvitation = async ({
  input,
  ctx,
}: {
  input: ResendInvitationInput;
  ctx: ProtectedContext;
}): Promise<ResendInvitationOutput> => {
  try {
    // 管理者権限を検証
    if (!ctx.isCurrentOrganizationAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "この操作を行う権限がありません",
      });
    }

    // トランザクションで処理
    const result = await ctx.db.$transaction(async (tx) => {
      // 既存の招待を取得
      const existingInvitation = await tx.organizationInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.currentOrganizationId,
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
    
    await sendResendInvitationEmail(
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
    console.error("招待再送信エラー:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "招待の再送信中にエラーが発生しました。",
    });
  }
};
