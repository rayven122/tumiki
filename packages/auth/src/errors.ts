export class OAuthError extends Error {
  constructor(
    message: string,
    public code: OAuthErrorCode,
    public provider?: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export enum OAuthErrorCode {
  // 認証エラー
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  NO_ACCESS_TOKEN = "NO_ACCESS_TOKEN",

  // 接続エラー
  CONNECTION_FAILED = "CONNECTION_FAILED",
  PROVIDER_ERROR = "PROVIDER_ERROR",

  // 設定エラー
  INVALID_PROVIDER = "INVALID_PROVIDER",
  INVALID_SCOPE = "INVALID_SCOPE",
  MISSING_CONFIGURATION = "MISSING_CONFIGURATION",

  // その他
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export const OAuthErrorMessages: Record<OAuthErrorCode, string> = {
  [OAuthErrorCode.UNAUTHORIZED]: "認証されていません",
  [OAuthErrorCode.TOKEN_EXPIRED]: "トークンの有効期限が切れています",
  [OAuthErrorCode.INVALID_TOKEN]: "無効なトークンです",
  [OAuthErrorCode.NO_ACCESS_TOKEN]: "アクセストークンが見つかりません",
  [OAuthErrorCode.CONNECTION_FAILED]: "プロバイダーへの接続に失敗しました",
  [OAuthErrorCode.PROVIDER_ERROR]: "プロバイダーからエラーが返されました",
  [OAuthErrorCode.INVALID_PROVIDER]: "無効なプロバイダーです",
  [OAuthErrorCode.INVALID_SCOPE]: "無効なスコープが指定されました",
  [OAuthErrorCode.MISSING_CONFIGURATION]: "必要な設定が不足しています",
  [OAuthErrorCode.UNKNOWN_ERROR]: "不明なエラーが発生しました",
};

export const createOAuthError = (
  code: OAuthErrorCode,
  provider?: string,
  cause?: unknown,
  customMessage?: string,
): OAuthError => {
  const message = customMessage ?? OAuthErrorMessages[code];
  return new OAuthError(message, code, provider, cause);
};
