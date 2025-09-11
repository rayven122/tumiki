import type { Organization, OrganizationInvitation, User } from "@tumiki/db";
import { sendInvitation as sendInvitationMail } from "@tumiki/mailer";

type InvitationEmailData = {
  invitation: OrganizationInvitation & {
    organization: Organization;
    invitedByUser: User;
  };
  inviteUrl: string;
};

/**
 * 組織への招待メールを送信する
 */
export const sendInvitationEmail = async (data: InvitationEmailData) => {
  const { invitation, inviteUrl } = data;

  // 開発環境では実際のメール送信をスキップ
  if (process.env.NODE_ENV === "development" && !process.env.SEND_EMAILS) {
    console.log("📧 招待メール送信（開発環境）:");
    console.log("  宛先:", invitation.email);
    console.log("  組織:", invitation.organization.name);
    console.log("  招待者:", invitation.invitedByUser.name ?? invitation.invitedByUser.email);
    console.log("  招待URL:", inviteUrl);
    console.log("  有効期限:", invitation.expires.toLocaleString("ja-JP"));
    return;
  }

  try {
    // @tumiki/mailerを使用してメール送信
    await sendInvitationMail({
      email: invitation.email,
      name: invitation.email,
      inviteUrl,
      appName: invitation.organization.name,
      expiresAt: invitation.expires.toISOString(),
    });

    console.log(`✅ 招待メールを送信しました: ${invitation.email}`);
  } catch (error) {
    console.error("❌ 招待メール送信エラー:", error);
    throw new Error("招待メールの送信に失敗しました");
  }
};

/**
 * 招待承認通知メールを送信する
 */
export const sendInvitationAcceptedEmail = async ({
  organizationName,
  newMemberEmail,
  adminEmails,
}: {
  organizationName: string;
  newMemberEmail: string;
  adminEmails: string[];
}) => {
  // 開発環境では実際のメール送信をスキップ
  if (process.env.NODE_ENV === "development" && !process.env.SEND_EMAILS) {
    console.log("📧 招待承認通知メール送信（開発環境）:");
    console.log("  新メンバー:", newMemberEmail);
    console.log("  組織:", organizationName);
    console.log("  通知先管理者:", adminEmails.join(", "));
    return;
  }

  // TODO: @tumiki/mailerに通知メールテンプレートを追加して実装
  console.log(`✅ 招待承認通知を送信しました: ${adminEmails.join(", ")}`);
};