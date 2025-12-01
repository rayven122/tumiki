/**
 * OAuth ユーティリティ関数
 */

/**
 * OAuth リダイレクトURI を取得
 * 環境変数から適切なベースURLを取得して構築
 *
 * 優先順位:
 * 1. NEXTAUTH_URL（明示的に設定されている場合）
 * 2. VERCEL_URL（Vercel環境 - プロトコルなしのため`https://`を追加）
 * 3. デフォルト（ローカル開発環境: https://local.tumiki.cloud:3000）
 *
 * Vercel環境では自動的にデプロイメントURLを使用:
 * - Preview: https://tumiki-[hash].vercel.app/api/oauth/callback
 * - Production: https://manager.tumiki.cloud/api/oauth/callback (NEXTAUTH_URLでカスタムドメイン設定時)
 *
 * @returns OAuth callback用のリダイレクトURI
 */
export const getOAuthRedirectUri = (): string => {
  // ベースURLの決定
  let baseUrl: string;

  if (process.env.NEXTAUTH_URL) {
    // 1. NEXTAUTH_URLが設定されている場合（最優先）
    baseUrl = process.env.NEXTAUTH_URL;
  } else if (process.env.VERCEL_URL) {
    // 2. Vercel環境の場合
    // VERCEL_URLはプロトコルなしのドメイン名のみ（例: "my-app-abc123.vercel.app"）
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    // 3. デフォルト（ローカル開発環境）
    baseUrl = "https://local.tumiki.cloud:3000";
  }

  return `${baseUrl}/api/oauth/callback`;
};
