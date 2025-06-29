/**
 * Auth0認証関連のユーティリティ関数
 */

/**
 * ログアウト処理を実行
 * Auth0のログアウトエンドポイントにリダイレクト
 */
export const logout = (): void => {
  window.location.href = "/auth/logout";
};

/**
 * ログイン処理を実行
 * Auth0のログインエンドポイントにリダイレクト
 */
export const login = (returnTo?: string): void => {
  const loginUrl = returnTo
    ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/auth/login";
  window.location.href = loginUrl;
};
