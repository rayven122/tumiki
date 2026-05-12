/**
 * Tumiki ディープリンク URL の生成・パース。
 *
 * `tumiki://oauth/reauth?connectionId=<n>` 形式の URL を扱う。
 * AI クライアントから MCP エラーレスポンス経由でユーザーに渡したリンクを
 * クリックすると Tumiki Desktop がフォアグラウンド化し、該当コネクトの
 * 再認証モーダルが自動オープンする仕組みに使う。
 *
 * 注: tumiki:// プロトコルは Keycloak 認証コールバック（auth/callback）と
 * 共用しているため、URL は hostname と pathname の組み合わせで識別する。
 */

const PROTOCOL = "tumiki";
const REAUTH_HOSTNAME = "oauth";
const REAUTH_PATHNAME = "/reauth";

/**
 * 指定された connectionId 向けの再認証ディープリンク URL を返す。
 * AI クライアントが Markdown リンクとしてレンダリングしやすいよう絶対 URL を返す。
 */
export const buildReauthDeepLink = (connectionId: number): string =>
  `${PROTOCOL}://${REAUTH_HOSTNAME}${REAUTH_PATHNAME}?connectionId=${String(connectionId)}`;

/**
 * URL が再認証ディープリンクであれば connectionId を返す。それ以外は null。
 * パース不能・他形式の tumiki:// URL でも安全に null を返す。
 */
export const parseReauthDeepLink = (
  url: string,
): { connectionId: number } | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== `${PROTOCOL}:`) return null;
  if (parsed.hostname !== REAUTH_HOSTNAME) return null;
  if (parsed.pathname !== REAUTH_PATHNAME) return null;

  const raw = parsed.searchParams.get("connectionId");
  if (!raw) return null;
  const connectionId = Number(raw);
  if (!Number.isInteger(connectionId) || connectionId <= 0) return null;
  return { connectionId };
};
