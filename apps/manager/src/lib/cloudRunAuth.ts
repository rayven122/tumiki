/**
 * @fileoverview Cloud Run IAM認証ユーティリティ
 *
 * Google Cloud Run へのリクエストに必要な OAuth2.0 アクセストークンを取得します。
 * Application Default Credentials (ADC) を使用して安全に認証情報を管理します。
 */

import { GoogleAuth } from "google-auth-library";

// Google Cloud 認証クライアント（シングルトン）
let authClient: GoogleAuth | undefined;

/**
 * Google Auth クライアントを取得（遅延初期化）
 * 注: IDトークン取得時は scopes を指定しない（scopes はアクセストークン用）
 */
const getAuthClient = (): GoogleAuth => {
  authClient ??= new GoogleAuth();
  return authClient;
};

/**
 * Cloud Run IAM 認証用のIDトークンを取得
 *
 * @param targetUrl - 対象のCloud RunサービスURL（オーディエンスとして使用）
 * @returns OAuth2.0 IDトークン
 * @throws Error - トークン取得に失敗した場合
 */
export const getCloudRunIdToken = async (
  targetUrl: string,
): Promise<string> => {
  try {
    const auth = getAuthClient();

    // IDトークンクライアントを取得（targetUrlをオーディエンスとして指定）
    const client = await auth.getIdTokenClient(targetUrl);

    // idTokenProviderから直接IDトークンを取得
    const idToken = await client.idTokenProvider.fetchIdToken(targetUrl);

    if (!idToken) {
      throw new Error("Failed to obtain ID token: token is empty");
    }

    return idToken;
  } catch (error) {
    console.error("Cloud Run IAM authentication failed:", error);
    throw new Error(
      `Cloud Run authentication error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Cloud Run へのリクエスト用の認証ヘッダーを作成
 *
 * @param targetUrl - 対象のCloud RunサービスURL（IDトークンのオーディエンス）
 * @param additionalHeaders - 追加のヘッダー（APIキーなど）
 * @returns Authorization ヘッダーを含むヘッダーオブジェクト
 */
export const createCloudRunHeaders = async (
  targetUrl: string,
  additionalHeaders: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const idToken = await getCloudRunIdToken(targetUrl);

  return {
    Authorization: `Bearer ${idToken}`,
    ...additionalHeaders,
  };
};
