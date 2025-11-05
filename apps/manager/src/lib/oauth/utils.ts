/**
 * OAuth ユーティリティ関数
 */

/**
 * OAuth リダイレクトURI を取得
 * 環境変数から取得、または動的に構築
 *
 * @param request - オプションのリクエストオブジェクト（origin取得用）
 * @returns OAuth callback用のリダイレクトURI
 */
export const getOAuthRedirectUri = (request?: Request): string => {
  // ベースURLの決定（優先順位: NEXTAUTH_URL > リクエストorigin > デフォルト）
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    request?.headers.get("origin") ??
    "https://local.tumiki.cloud:3000";

  // リダイレクトURI（環境変数で上書き可能）
  return (
    process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ??
    `${baseUrl}/api/oauth/callback`
  );
};
