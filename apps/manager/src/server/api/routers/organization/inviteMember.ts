import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import type { ProtectedContext } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createMailClient, sendInvitation } from "@tumiki/mailer";
import { inviteMemberInput } from "@/server/utils/organizationSchemas";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";

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
 * デフォルト値を使用し、環境変数で上書き可能
 */
const initializeMailClient = (): void => {
  createMailClient({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: Number(process.env.SMTP_PORT ?? "587") === 465,
    auth: {
      user: process.env.SMTP_USER ?? "TechNeighbor122@gmail.com",
      pass: process.env.SMTP_PASS ?? "",
    },
    from: process.env.FROM_EMAIL ?? "info@tumiki.cloud",
  });
};

/**
 * 招待URLを生成する
 */
const generateInviteUrl = (token: string): string => {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXTAUTH_URL
      : "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
};

/**
 * 招待メールを送信する（最適化版）
 */
const sendInvitationEmail = async (
  email: string,
  inviteUrl: string,
  organizationName: string,
  isAdmin = false,
  roleIds: string[] = [],
  expiresAt?: string,
): Promise<void> => {
  try {
    initializeMailClient();

    // 役割情報を含むカスタマイズメッセージ
    const roleInfo = isAdmin
      ? "管理者として"
      : roleIds.length > 0
        ? `${roleIds.length}個の役割と共に`
        : "";

    const customName = roleInfo ? `${email}（${roleInfo}招待）` : email;

    void sendInvitation({
      email,
      name: customName,
      inviteUrl,
      appName: organizationName,
      expiresAt,
    }).catch((error: unknown) => {
      // エラーハンドリングは既に関数内で行われている
      console.error(
        "招待メール送信エラー:",
        error instanceof Error ? error.message : String(error),
      );
    });
  } catch (emailError: unknown) {
    console.error(
      INVITATION_MESSAGES.EMAIL_SEND_FAILED,
      emailError instanceof Error ? emailError.message : String(emailError),
    );
    // メール送信失敗でもユーザーには招待成功を返す
    // （グレースフルデグラデーション）
  }
};

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
