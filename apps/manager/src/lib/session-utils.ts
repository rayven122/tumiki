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
 * ⚠️ セキュリティ上の注意:
 * この関数はクッキーの存在のみをチェックし、トークンの有効性や改ざんを検証しません。
 * Database strategyを使用しているため、Edge Runtimeではトークンの検証ができません。
 * 実際のセッション検証はNode.js Runtimeで実行されるルート（API routes等）で行われます。
 *
 * 今後の改善案:
 * - JWT strategyへの移行を検討（Edge Runtimeでの検証が可能になる）
 * - または、セッションIDの署名検証を追加（HMAC等）
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
