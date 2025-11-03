/**
 * OAuth Legacy Types and Errors
 *
 * NOTE: これらはAuth0時代のOAuth実装で使用されていた型とエラー定義です。
 * Auth.js + Keycloakベースの新しいOAuth実装が完成するまでの暫定的な定義です。
 *
 * TODO: Auth.jsベースの新しいOAuth実装に置き換える
 */

/**
 * OAuthエラーコード
 * @deprecated Auth.jsベースの実装に置き換え予定
 */
export enum OAuthErrorCode {
  INVALID_STATE = "invalid_state",
  INVALID_PROVIDER = "invalid_provider",
  TOKEN_EXCHANGE_FAILED = "token_exchange_failed",
  USER_INFO_FAILED = "user_info_failed",
  MISSING_CREDENTIALS = "missing_credentials",
  PROVIDER_ERROR = "provider_error",
}

/**
 * OAuthエラークラス
 * @deprecated Auth.jsベースの実装に置き換え予定
 */
export class OAuthError extends Error {
  constructor(
    public code: OAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}
