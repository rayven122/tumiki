/**
 * @fileoverview Cloud Run IAM認証ユーティリティ
 *
 * Google Cloud Run へのリクエストに必要な OAuth2.0 IDトークンを取得します。
 * Application Default Credentials (ADC) を使用して安全に認証情報を管理します。
 */

import { GoogleAuth } from "google-auth-library";
import { logInfo, logError } from "../../shared/logger/index.js";

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
 * @param serviceUrl - 対象のCloud RunサービスURL（フルURLまたはベースURL）
 * @returns OAuth2.0 IDトークン
 * @throws Error - トークン取得に失敗した場合
 */
export const getCloudRunIdToken = async (
  serviceUrl: string,
): Promise<string> => {
  try {
    // URLからオーディエンス（プロトコル + ホスト）を抽出
    const url = new URL(serviceUrl);
    const targetAudience = `${url.protocol}//${url.host}`;

    const auth = getAuthClient();

    // IDトークンクライアントを取得（targetAudienceをオーディエンスとして指定）
    const client = await auth.getIdTokenClient(targetAudience);

    // idTokenProviderから直接IDトークンを取得
    const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);

    if (!idToken) {
      throw new Error("Failed to obtain ID token: token is empty");
    }

    logInfo("Cloud Run ID token obtained successfully", {
      serviceUrl,
      targetAudience,
      tokenPreview: idToken.substring(0, 20),
    });

    return idToken;
  } catch (error) {
    logError("Cloud Run IAM authentication failed", error as Error, {
      serviceUrl,
    });
    throw new Error(
      `Cloud Run authentication error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Cloud Run へのリクエスト用の認証ヘッダーを作成
 *
 * @param serviceUrl - 対象のCloud RunサービスURL（フルURLまたはベースURL）
 * @param additionalHeaders - 追加のヘッダー（APIキーなど）
 * @returns Authorization ヘッダーを含むヘッダーオブジェクト
 */
export const createCloudRunHeaders = async (
  serviceUrl: string,
  additionalHeaders: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const idToken = await getCloudRunIdToken(serviceUrl);

  return {
    Authorization: `Bearer ${idToken}`,
    ...additionalHeaders,
  };
};
