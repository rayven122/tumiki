/**
 * URL関連のユーティリティ関数
 *
 * Cloudflare Tunnel等のリバースプロキシ環境では、Next.jsサーバーはlocalhostで動作するため、
 * request.url が localhost になってしまう。このモジュールでは環境変数から正しいベースURLを取得する。
 */

/**
 * アプリケーションのベースURLを取得
 *
 * 優先順位:
 * 1. ブラウザ環境: window.location.origin（現在のページのオリジン）
 * 2. NEXTAUTH_URL（明示的に設定されている場合）
 * 3. VERCEL_URL（Vercel環境 - プロトコルなしのため`https://`を追加）
 * 4. デフォルト（ローカル開発環境: http://localhost:3000）
 *
 * @returns アプリケーションのベースURL（末尾スラッシュなし）
 */
export const getAppBaseUrl = (): string => {
  // ブラウザ環境では現在のページのオリジンを使用
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // サーバーサイドでは環境変数から取得
  if (process.env.NEXTAUTH_URL) {
    // 末尾のスラッシュを削除
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    // VERCEL_URLはプロトコルなしのドメイン名のみ（例: "my-app-abc123.vercel.app"）
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

/**
 * OAuth リダイレクトURI を取得
 * 環境変数から適切なベースURLを取得して構築
 *
 * @returns OAuth callback用のリダイレクトURI
 */
export const getOAuthRedirectUri = (): string => {
  return `${getAppBaseUrl()}/api/oauth/callback`;
};

/**
 * 招待URLを生成する
 *
 * @param token - 招待トークン
 * @returns 招待URL
 */
export const generateInviteUrl = (token: string): string => {
  return `${getAppBaseUrl()}/invite/${token}`;
};
