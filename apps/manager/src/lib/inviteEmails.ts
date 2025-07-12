import "server-only";

/**
 * 招待メール送信のインターフェース
 * 将来実装予定
 */
export interface InviteEmailData {
  email: string;
  organizationName: string;
  inviterName: string;
  inviteToken: string;
  inviteUrl: string;
}

/**
 * 招待メールを送信する（将来実装）
 * @param data 招待メールデータ
 */
export const sendInviteEmail = async (data: InviteEmailData): Promise<void> => {
  // TODO: メール送信の実装
  // 現在はコンソールにログ出力のみ
  console.log("招待メール送信（未実装）:", {
    to: data.email,
    organization: data.organizationName,
    inviter: data.inviterName,
    url: data.inviteUrl,
  });
};

/**
 * 招待リマインダーメールを送信する（将来実装）
 * @param data 招待メールデータ
 */
export const sendInviteReminderEmail = async (data: InviteEmailData): Promise<void> => {
  // TODO: リマインダーメール送信の実装
  console.log("招待リマインダーメール送信（未実装）:", {
    to: data.email,
    organization: data.organizationName,
    url: data.inviteUrl,
  });
};