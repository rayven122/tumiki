/**
 * OAuth トークンリフレッシュ
 *
 * access_token の有効期限をチェックし、期限切れまたは期限間近の場合に
 * refresh_token を使って自動的にトークンをリフレッシュする。
 * リフレッシュ後の新しいcredentialsはDBに暗号化保存される。
 */

import * as oauth from "oauth4webapi";
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

/**
 * refresh 失敗時の分類。
 * - FATAL: refresh_token そのものが無効化されているため、ユーザー再認証が必要
 * - TRANSIENT: ネットワーク・5xx 等の一時的失敗。次回再試行で復活する可能性あり
 */
type RefreshFailureKind = "FATAL" | "TRANSIENT";

/**
 * 認可サーバーが「refresh_token 自体が無効」を示す際に返す代表的なエラーコード集合。
 * RFC 6749 §5.2 + 各プロバイダの慣習に基づく（invalid_grant が最一般）。
 */
const FATAL_OAUTH_ERROR_CODES = new Set([
  "invalid_grant",
  "invalid_token",
  "expired_token",
  "unauthorized_client",
  "invalid_client",
]);

/**
 * refreshTokenGrantRequest が投げたエラーを FATAL / TRANSIENT に分類する。
 * 判定材料が無いケース（不明）は誤検知防止のため TRANSIENT 側に倒す。
 */
export const classifyRefreshError = (error: unknown): RefreshFailureKind => {
  if (error instanceof oauth.ResponseBodyError) {
    if (FATAL_OAUTH_ERROR_CODES.has(error.error)) return "FATAL";
    // 401/403 のみ FATAL とする。429 (rate limit) や 408 (timeout) のような
    // 一時的な 4xx は TRANSIENT 側に倒し、誤った needsReauth フラグ立てを防ぐ
    if (error.status === 401 || error.status === 403) return "FATAL";
    return "TRANSIENT";
  }
  return "TRANSIENT";
};

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

// secretId 単位でリフレッシュ。リフレッシュ不要・refresh_token 欠如・API失敗等は null を返す。
export const refreshOAuthTokenIfNeeded = async (
  secretId: number,
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
      { secretId, serverUrl },
    );
    return null;
  }

  try {
    const bundle = await loadOAuthClientBundle(serverUrl);
    if (!bundle) return null;

    logger.info("OAuthトークンをリフレッシュします", {
      secretId,
      serverUrl,
    });

    const tokenData = await refreshAccessToken(
      bundle.authServer,
      bundle.client,
      refreshToken,
    );

    const newCredentials = credentialsPayloadFromTokenData(tokenData);

    // McpSecret を更新することで共有先の全コネクションに反映される
    const db = await getDb();
    const encrypted = await encryptToken(JSON.stringify(newCredentials));
    await oauthRepository.updateSecretCredentials(db, secretId, encrypted);

    logger.info("OAuthトークンのリフレッシュが完了しました", {
      secretId,
      serverUrl,
      expiresAt: newCredentials["expires_at"],
    });

    return newCredentials;
  } catch (error) {
    const kind = classifyRefreshError(error);
    const message = error instanceof Error ? error.message : String(error);
    logger.error("OAuthトークンのリフレッシュに失敗しました", {
      secretId,
      serverUrl,
      kind,
      error: message,
    });

    // FATAL のときだけ「要再認証」フラグを立てる。TRANSIENT で立てると
    // ネットワーク不調で偽陽性が出て、ユーザーに不必要な再認証を促してしまう。
    if (kind === "FATAL") {
      try {
        const db = await getDb();
        await oauthRepository.markSecretNeedsReauth(db, secretId);
      } catch (markError) {
        logger.error("needsReauth フラグ更新に失敗しました", {
          secretId,
          error:
            markError instanceof Error ? markError.message : String(markError),
        });
      }
    }

    return null;
  }
};
