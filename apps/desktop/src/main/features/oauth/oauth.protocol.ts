/**
 * MCP OAuthカスタムプロトコルハンドラー
 *
 * tumiki://oauth/callback?code=xxx&state=yyy のURLを解析する。
 * 既存の tumiki-desktop://auth/callback (Keycloak用) とは別系統。
 */

const MCP_OAUTH_PROTOCOL = "tumiki:";
const MCP_OAUTH_HOST = "oauth";
const MCP_OAUTH_PATHNAME = "/callback";

/** コールバックURLの解析結果 */
export type OAuthCallbackParams = {
  code: string;
  state: string;
};

/**
 * URLがMCP OAuthコールバックかどうか判定
 */
export const isMcpOAuthCallback = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === MCP_OAUTH_PROTOCOL &&
      parsed.hostname === MCP_OAUTH_HOST &&
      parsed.pathname === MCP_OAUTH_PATHNAME
    );
  } catch {
    return false;
  }
};

/**
 * コールバックURLをパースして検証
 *
 * @throws OAuthエラーレスポンスまたは必須パラメータ欠落時
 */
export const parseOAuthCallback = (url: string): OAuthCallbackParams => {
  const parsed = new URL(url);

  // OAuthエラーレスポンスの検証（RFC 6749 Section 4.1.2.1）
  const oauthError = parsed.searchParams.get("error");
  if (oauthError) {
    const description =
      parsed.searchParams.get("error_description") ?? oauthError;
    throw new Error(`OAuth認証エラー: ${description}`);
  }

  const code = parsed.searchParams.get("code");
  if (!code) {
    throw new Error("認可コードが見つかりません");
  }

  const state = parsed.searchParams.get("state");
  if (!state) {
    throw new Error("stateパラメータが見つかりません");
  }

  return { code, state };
};
