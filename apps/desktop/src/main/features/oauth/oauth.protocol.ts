/**
 * OAuthコールバックURLパーサー
 *
 * RFC 8252（OAuth 2.0 for Native Apps）準拠のループバックHTTP方式に移行済み。
 * ループバックサーバーが受信した `http://127.0.0.1:<port>/callback?code=...&state=...` を解析する。
 */

/** コールバックURLの解析結果 */
export type OAuthCallbackParams = {
  code: string;
  state: string;
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
