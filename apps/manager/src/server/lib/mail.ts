import { createMailClient, sendInvitation } from "@tumiki/mailer";

/**
 * メールクライアントの初期化状態を管理
 */
let isMailClientInitialized = false;

/**
 * メールクライアントを初期化（シングルトンパターン）
 * アプリケーション全体で1回のみ実行される
 *
 * SMTP設定は環境変数から自動的に読み込まれます:
 * - SMTP_HOST: SMTPサーバーのホスト名
 * - SMTP_PORT: SMTPサーバーのポート番号
 * - SMTP_USER: SMTP認証ユーザー名
 * - SMTP_PASS: SMTP認証パスワード
 * - FROM_EMAIL: 送信元メールアドレス
 */
export const initializeMailClient = (): void => {
  if (isMailClientInitialized) {
    return;
  }

  // 環境変数から自動的にSMTP設定を読み込む
  createMailClient();
  isMailClientInitialized = true;
};

/**
 * 招待メールを送信する
 *
 * @param email - 送信先メールアドレス
 * @param inviteUrl - 招待URL
 * @param organizationName - 組織名
 * @param roles - ロール配列（デフォルト: ["Member"]）
 * @param expiresAt - 有効期限（ISO形式文字列、オプション）
 */
export const sendInvitationEmail = async (
  email: string,
  inviteUrl: string,
  organizationName: string,
  roles: string[] = ["Member"],
  expiresAt?: string,
): Promise<void> => {
  try {
    // メールクライアントが初期化されていなければ初期化
    initializeMailClient();

    // 役割情報を含むカスタマイズメッセージ
    const roleInfo =
      roles.length > 0 ? `${roles.join(", ")}として` : "メンバーとして";

    const customName = `${email}（${roleInfo}招待）`;

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
