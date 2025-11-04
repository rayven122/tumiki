import type { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";

/**
 * クッキーオブジェクトの型
 * NextRequest.cookiesとauth.config.tsのcookies両方に対応
 */
type CookiesGetter = {
  get: (name: string) => RequestCookie | undefined;
};

/**
 * セッショントークンを取得する共通ユーティリティ
 * Next.jsのcookiesとRequestのcookiesの両方に対応
 *
 * @param cookies - クッキーオブジェクト
 * @returns セッショントークンのRequestCookie または undefined
 */
export const getSessionToken = (
  cookies: CookiesGetter,
): RequestCookie | undefined => {
  return (
    cookies.get("authjs.session-token") ??
    cookies.get("__Secure-authjs.session-token")
  );
};
