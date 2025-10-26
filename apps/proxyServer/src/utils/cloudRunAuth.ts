/**
 * @fileoverview Cloud Run IAM認証ユーティリティ
 *
 * Google Cloud Run へのリクエストに必要な OAuth2.0 アクセストークンを取得します。
 * Application Default Credentials (ADC) を使用して安全に認証情報を管理します。
 */

import { GoogleAuth } from "google-auth-library";
import { recordError } from "../libs/metrics.js";

// Google Cloud 認証クライアント（シングルトン）
let authClient: GoogleAuth | undefined;

/**
 * Google Auth クライアントを取得（遅延初期化）
 */
const getAuthClient = (): GoogleAuth => {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return authClient;
};

/**
 * テスト用：認証クライアントをリセット
 * @internal
 */
export const resetAuthClient = (): void => {
  authClient = undefined;
};

/**
 * Cloud Run IAM 認証用のアクセストークンを取得
 *
 * @returns OAuth2.0 アクセストークン
 * @throws Error - トークン取得に失敗した場合
 */
export const getCloudRunAccessToken = async (): Promise<string> => {
  try {
    const auth = getAuthClient();
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();

    if (!accessTokenResponse.token) {
      throw new Error("Failed to obtain access token");
    }

    return accessTokenResponse.token;
  } catch (error) {
    recordError("cloud_run_auth_failed");
    console.error("Cloud Run IAM authentication failed:", error);
    throw new Error(
      `Cloud Run authentication error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Cloud Run へのリクエスト用の認証ヘッダーを作成
 *
 * @param additionalHeaders - 追加のヘッダー（APIキーなど）
 * @returns Authorization ヘッダーを含むヘッダーオブジェクト
 */
export const createCloudRunHeaders = async (
  additionalHeaders: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const accessToken = await getCloudRunAccessToken();

  return {
    Authorization: `Bearer ${accessToken}`,
    ...additionalHeaders,
  };
};
