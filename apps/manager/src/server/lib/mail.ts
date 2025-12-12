import { createMailClient, sendInvitation } from "@tumiki/mailer";

/**
 * SMTP設定のデフォルト値
 * 環境変数で上書き可能
 */
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? "587"),
  secure: Number(process.env.SMTP_PORT ?? "587") === 465,
  auth: {
    user: process.env.SMTP_USER ?? "TechNeighbor122@gmail.com",
    pass: process.env.SMTP_PASS ?? "",
  },
  from: process.env.FROM_EMAIL ?? "info@tumiki.cloud",
} as const;

/**
 * メールクライアントの初期化状態を管理
 */
let isMailClientInitialized = false;

/**
 * メールクライアントを初期化（シングルトンパターン）
 * アプリケーション全体で1回のみ実行される
 */
export const initializeMailClient = (): void => {
  if (isMailClientInitialized) {
    return;
  }

  createMailClient(SMTP_CONFIG);
  isMailClientInitialized = true;
};

/**
 * 招待メールを送信する
 *
 * @param email - 送信先メールアドレス
 * @param inviteUrl - 招待URL
 * @param organizationName - 組織名
 * @param isAdmin - 管理者フラグ（デフォルト: false）
 * @param roleIds - ロールID配列（デフォルト: []）
 * @param expiresAt - 有効期限（ISO形式文字列、オプション）
 */
export const sendInvitationEmail = async (
  email: string,
  inviteUrl: string,
  organizationName: string,
  isAdmin = false,
  roleIds: string[] = [],
  expiresAt?: string,
): Promise<void> => {
  try {
    // メールクライアントが初期化されていなければ初期化
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
      console.error(
        "招待メール送信エラー:",
        error instanceof Error ? error.message : String(error),
      );
    });
  } catch (emailError: unknown) {
    console.error(
      "招待メール送信に失敗しました:",
      emailError instanceof Error ? emailError.message : String(emailError),
    );
    // メール送信失敗でもユーザーには招待成功を返す
    // （グレースフルデグラデーション）
  }
};

/**
 * 招待URLを生成する
 *
 * @param token - 招待トークン
 * @returns 招待URL
 */
export const generateInviteUrl = (token: string): string => {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.NEXTAUTH_URL
      : "http://localhost:3000";
  return `${baseUrl}/invite/${token}`;
};
