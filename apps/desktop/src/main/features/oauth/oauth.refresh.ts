/**
 * OAuth トークンリフレッシュ
 *
 * access_token の有効期限をチェックし、期限切れまたは期限間近の場合に
 * refresh_token を使って自動的にトークンをリフレッシュする。
 * リフレッシュ後の新しいcredentialsはDBに暗号化保存される。
 */

import type * as oauth from "oauth4webapi";
import { getDb } from "../../shared/db";
import * as logger from "../../shared/utils/logger";
import { encryptToken } from "../../utils/encryption";
import { refreshAccessToken } from "./oauth.token";
import * as oauthRepository from "./oauth.repository";
import {
  oauthClientFromParts,
  credentialsPayloadFromTokenData,
  isCacheableAuthorizationServerMetadata,
} from "./oauth.service";

/** リフレッシュ実行の閾値（秒）: 期限切れまでこの値以下ならリフレッシュ */
const REFRESH_THRESHOLD_SECONDS = 5 * 60;

/**
 * credentials の expires_at がリフレッシュ閾値以内かどうかを判定
 */
export const isTokenExpiringSoon = (
  credentials: Record<string, string>,
): boolean => {
  const expiresAt = credentials["expires_at"];
  if (!expiresAt) return false;

  const expiresAtSec = Number(expiresAt);
  if (Number.isNaN(expiresAtSec)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  return expiresAtSec - nowSec <= REFRESH_THRESHOLD_SECONDS;
};

/**
 * OAuthClientBundleをDBから再構築する
 */
const loadOAuthClientBundle = async (
  serverUrl: string,
): Promise<{
  authServer: oauth.AuthorizationServer;
  client: oauth.Client;
} | null> => {
  const db = await getDb();
  const cached = await oauthRepository.findByServerUrl(db, serverUrl);
  if (!cached) {
    logger.warn("OAuthClient がDBに見つかりません", { serverUrl });
    return null;
  }

  const parsed: unknown = JSON.parse(cached.authServerMetadata);
  if (!isCacheableAuthorizationServerMetadata(parsed)) {
    logger.warn("キャッシュ済みOAuthメタデータが不正です", { serverUrl });
    return null;
  }

  return {
    authServer: parsed,
    client: oauthClientFromParts(
      cached.clientId,
      cached.clientSecret,
      cached.tokenEndpointAuthMethod,
    ),
  };
};

/**
 * 必要に応じてOAuthトークンをリフレッシュし、新しいcredentialsを返す。
 *
 * - リフレッシュ不要（期限に余裕がある）→ null
 * - リフレッシュ成功 → 新しい復号済みcredentials
 * - リフレッシュ失敗（refresh_tokenなし、OAuthClient未登録、API エラー等）→ null
 */
export const refreshOAuthTokenIfNeeded = async (
  connectionId: number,
  serverUrl: string,
  credentials: Record<string, string>,
): Promise<Record<string, string> | null> => {
  if (!isTokenExpiringSoon(credentials)) {
    return null;
  }

  const refreshToken = credentials["refresh_token"];
  if (!refreshToken) {
    logger.warn(
      "OAuthトークンが期限切れですが refresh_token がないためリフレッシュできません",
      { connectionId, serverUrl },
    );
    return null;
  }

  try {
    const bundle = await loadOAuthClientBundle(serverUrl);
    if (!bundle) return null;

    logger.info("OAuthトークン���リフレッシュします", {
      connectionId,
      serverUrl,
    });

    const tokenData = await refreshAccessToken(
      bundle.authServer,
      bundle.client,
      refreshToken,
    );

    const newCredentials = credentialsPayloadFromTokenData(tokenData);

    // 暗号化してDBに保存
    const db = await getDb();
    const encrypted = await encryptToken(JSON.stringify(newCredentials));
    await oauthRepository.updateConnectionCredentials(
      db,
      connectionId,
      encrypted,
    );

    logger.info("OAuthトークンのリフレッシュが完了しました", {
      connectionId,
      serverUrl,
      expiresAt: newCredentials["expires_at"],
    });

    return newCredentials;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("OAuthトークンのリフレッシュに失敗しました", {
      connectionId,
      serverUrl,
      error: message,
    });
    return null;
  }
};
