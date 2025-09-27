import type {
  Compute,
  JWT,
  OAuth2Client,
  UserRefreshClient,
} from "google-auth-library";

/**
 * googleapis ライブラリで使用される認証型
 * googleapis のほとんどのAPIクライアントはこれらの型を受け入れます
 */
export type GoogleApiAuth = OAuth2Client | JWT | Compute | UserRefreshClient;

/**
 * Google API のエラーレスポンス構造
 */
export type GoogleApiError = {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
} & Error;
