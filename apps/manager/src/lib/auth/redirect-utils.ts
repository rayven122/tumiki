/**
 * 禁止パスのリスト（認証ループを防ぐ）
 */
const DISALLOWED_CALLBACK_PATHS = ["/signin", "/signup", "/api/auth/"];

/**
 * アプリケーションのベースURLを取得
 * 環境変数が未設定の場合はエラーをスロー（開発環境のみフォールバック許可）
 */
export const getBaseUrl = (): string => {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    // 開発環境のみフォールバック許可
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000";
    }
    throw new Error("NEXTAUTH_URL environment variable is required");
  }
  return baseUrl;
};

/**
 * callbackUrlが安全かどうかを検証する
 * Open Redirect脆弱性を防ぐため、同一オリジンのみ許可
 *
 * @param url - 検証対象のURL
 * @returns 安全な場合はtrue
 */
export const isValidCallbackUrl = (url: string): boolean => {
  try {
    const baseUrl = getBaseUrl();
    const parsedUrl = new URL(url, baseUrl);
    const allowedOrigin = new URL(baseUrl).origin;

    // 同一オリジンのみ許可
    if (parsedUrl.origin !== allowedOrigin) {
      return false;
    }

    // 禁止パスチェック
    return !DISALLOWED_CALLBACK_PATHS.some((path) =>
      parsedUrl.pathname.startsWith(path),
    );
  } catch {
    return false;
  }
};

/**
 * 認証後のリダイレクト先URLを決定する
 *
 * 優先順位:
 * 1. 招待リンク（最優先）
 * 2. デフォルト組織ページ（ログイン済みユーザー）
 * 3. その他の有効なcallbackUrl
 * 4. オンボーディングページ（新規ユーザー）
 *
 * @param callbackUrl - リクエストされたcallbackUrl
 * @param orgSlug - ユーザーのデフォルト組織スラッグ
 * @param isNewUser - 新規ユーザーフラグ（サインアップの場合true）
 * @returns リダイレクト先URL
 */
export const determineRedirectUrl = (
  callbackUrl: string | null | undefined,
  orgSlug: string | null | undefined,
  isNewUser = false,
): string => {
  // callbackUrlのバリデーション
  const validatedCallbackUrl =
    callbackUrl && isValidCallbackUrl(callbackUrl) ? callbackUrl : null;

  // 招待リンクは最優先
  if (validatedCallbackUrl?.startsWith("/invite/")) {
    return validatedCallbackUrl;
  }

  // デフォルト組織ページ
  if (orgSlug) {
    return `/${orgSlug}/mcps`;
  }

  // その他の有効なcallbackUrl
  if (validatedCallbackUrl) {
    return validatedCallbackUrl;
  }

  // 新規ユーザーの場合はオンボーディングへ
  return isNewUser ? "/onboarding?first=true" : "/onboarding";
};
