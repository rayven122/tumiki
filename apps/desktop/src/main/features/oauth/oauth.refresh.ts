/**
 * OAuth トークンリフレッシュ
 *
 * access_token の有効期限をチェックし、期限切れまたは期限間近の場合に
 * refresh_token を使って自動的にトークンをリフレッシュする。
 * リフレッシュ後の新しいcredentialsはDBに暗号化保存される。
 *
 * 機能:
 * - refreshOAuthTokenIfNeeded: 起動時 / コンフィグ構築時に呼ばれる従来からの API
 * - refreshOAuthTokenIfNeededOnce: 並行リフレッシュを secretId 単位で抑制するラッパー
 * - resolveOAuthHeaders: ランタイム resolveHeaders コールバック用。
 *   インメモリキャッシュで毎リクエスト DB を叩かないようにし、
 *   キャッシュミス／期限切れ間近のときだけ refresh を試みる。
 */

import * as oauth from "oauth4webapi";
import { z } from "zod";
import { getDb } from "../../shared/db";
import * as logger from "../../shared/utils/logger";
import { encryptToken } from "../../utils/encryption";
import { decryptCredentials } from "../../utils/credentials";
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

/** 機微情報をログに残さないため access_token の先頭8文字だけを返す */
const tokenPrefix = (token: string | undefined): string => {
  if (!token) return "<none>";
  return token.length > 8 ? `${token.slice(0, 8)}...` : `${token}...`;
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

  const startMs = Date.now();
  try {
    const bundle = await loadOAuthClientBundle(serverUrl);
    if (!bundle) return null;

    const expiresAt = Number(credentials["expires_at"]);
    const remainingSec = Number.isFinite(expiresAt)
      ? expiresAt - Math.floor(Date.now() / 1000)
      : null;
    logger.info("OAuthトークンをリフレッシュします", {
      secretId,
      serverUrl,
      remainingSec,
      oldTokenPrefix: tokenPrefix(credentials["access_token"]),
    });

    // 元の grant で得た scope を refresh にも渡し、audience/scope が落ちる
    // プロバイダ実装への保険とする（RFC 6749 §6 で許容される）
    const tokenData = await refreshAccessToken(
      bundle.authServer,
      bundle.client,
      refreshToken,
      credentials["scope"],
    );

    const newCredentials = credentialsPayloadFromTokenData(tokenData);

    // McpSecret を更新することで共有先の全コネクションに反映される
    const db = await getDb();
    const encrypted = await encryptToken(JSON.stringify(newCredentials));
    await oauthRepository.updateSecretCredentials(db, secretId, encrypted);

    logger.info("OAuthトークンのリフレッシュが完了しました", {
      secretId,
      serverUrl,
      latencyMs: Date.now() - startMs,
      expiresAt: newCredentials["expires_at"],
      newTokenPrefix: tokenPrefix(newCredentials["access_token"]),
      refreshTokenRotated:
        newCredentials["refresh_token"] !== undefined &&
        newCredentials["refresh_token"] !== refreshToken,
    });

    return newCredentials;
  } catch (error) {
    const kind = classifyRefreshError(error);
    const message = error instanceof Error ? error.message : String(error);
    logger.error("OAuthトークンのリフレッシュに失敗しました", {
      secretId,
      serverUrl,
      kind,
      latencyMs: Date.now() - startMs,
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

/**
 * 実行中のリフレッシュ Promise を secretId 単位でキャッシュし、同一 secret の並行リフレッシュを防止する。
 * 現在は secretId が McpSecret テーブル PK として一意なためキーは secretId のみで十分。
 * 将来 secretId を複数サーバーで共有する設計に変わった場合は、
 * キーを `${secretId}:${serverUrl}` のような複合キーに変更する必要がある。
 */
const inflightRefreshes = new Map<
  number,
  Promise<Record<string, string> | null>
>();

/**
 * refreshOAuthTokenIfNeeded の並行リフレッシュ防止ラッパー。
 * 同一 secretId に対して複数の fetch が同時にリフレッシュを試みた場合、
 * 最初の呼び出しの結果を全員が共有する。
 *
 * refresh_token rotation を採用するプロバイダでは「使用済みrefresh_token」を
 * 2回目以降が叩いて invalid_grant になる事故を防ぐ。
 */
export const refreshOAuthTokenIfNeededOnce = async (
  secretId: number,
  serverUrl: string,
  credentials: Record<string, string>,
): Promise<Record<string, string> | null> => {
  const existing = inflightRefreshes.get(secretId);
  if (existing) {
    logger.debug("既存のリフレッシュ Promise を共有", { secretId });
    return existing;
  }

  const promise = refreshOAuthTokenIfNeeded(
    secretId,
    serverUrl,
    credentials,
  ).finally(() => inflightRefreshes.delete(secretId));

  inflightRefreshes.set(secretId, promise);
  return promise;
};

/** credentials の JSON schema（Record<string, string>） */
const credentialsSchema = z.record(z.string(), z.string());

/**
 * resolveOAuthHeaders のインメモリキャッシュ。
 *
 * 目的: ランタイム resolveHeaders はリクエスト毎に呼ばれるため、毎回 DB を叩くと
 * 性能影響が大きい。キャッシュヒット時は復号もスキップして即返す。
 *
 * 整合性:
 * - リフレッシュが成功してDB更新したタイミングで、キャッシュも同時に更新
 * - 別経路で credentials が更新された場合（manual re-auth など）はキャッシュが古くなるが、
 *   次回 isTokenExpiringSoon が false なら現状維持で実害なし。期限が迫れば refresh パスに入って
 *   loadFromDb が走り、最新値で上書きされる
 */
type CachedCredentials = {
  credentials: Record<string, string>;
};
const credentialsCache = new Map<number, CachedCredentials>();

/** テスト・運用時のキャッシュリセット用（プロダクションコードからは呼ばない） */
export const _resetResolveOAuthHeadersCache = (): void => {
  credentialsCache.clear();
  inflightRefreshes.clear();
};

/**
 * DBから credentials を読込み復号する。失敗時は null を返す。
 */
const loadCredentialsFromDb = async (
  secretId: number,
): Promise<Record<string, string> | null> => {
  const db = await getDb();
  const secret = await db.mcpSecret.findUnique({
    where: { id: secretId },
    select: { credentials: true },
  });
  if (!secret) {
    logger.warn("McpSecret が見つかりません", { secretId });
    return null;
  }

  let rawJson: unknown;
  try {
    const plain = await decryptCredentials(secret.credentials);
    rawJson = JSON.parse(plain);
  } catch {
    logger.warn("credentials の復号またはJSONパースに失敗しました", {
      secretId,
    });
    return null;
  }

  const parsed = credentialsSchema.safeParse(rawJson);
  if (!parsed.success) {
    logger.warn("credentials の形式が不正です", { secretId });
    return null;
  }
  return parsed.data;
};

/**
 * DB から最新の credentials を読み込み、必要ならリフレッシュし、
 * Authorization ヘッダーを返す。mcp-core-proxy の resolveHeaders コールバックとして使用する。
 *
 * フロー:
 *   1. キャッシュヒット → 期限チェック → 期限内ならそのまま返す
 *   2. キャッシュミス / 期限切れ間近 → DB読込 → refresh試行 → キャッシュ更新
 *   3. いずれの失敗でも空ヘッダーを返す（fetchは普通に走り、上流から401をもらう）
 *
 * @returns `{ Authorization: "Bearer ..." }` か `{}`
 */
export const resolveOAuthHeaders = async (
  secretId: number,
  serverUrl: string,
): Promise<Record<string, string>> => {
  // ── キャッシュ参照 ──
  const cached = credentialsCache.get(secretId);
  if (cached && !isTokenExpiringSoon(cached.credentials)) {
    logger.debug("resolveOAuthHeaders: cache hit", {
      secretId,
      tokenPrefix: tokenPrefix(cached.credentials["access_token"]),
    });
    return buildAuthHeader(cached.credentials);
  }

  // ── キャッシュミス or 期限切れ間近: DBから読み直し ──
  logger.debug("resolveOAuthHeaders: cache miss or expiring", {
    secretId,
    reason: cached ? "expiring-soon" : "no-cache",
  });
  const fromDb = await loadCredentialsFromDb(secretId);
  if (!fromDb) {
    return {};
  }

  // ── refresh 試行（dedup 付き） ──
  let credentials = fromDb;
  const refreshed = await refreshOAuthTokenIfNeededOnce(
    secretId,
    serverUrl,
    credentials,
  );
  if (refreshed) credentials = refreshed;

  // ── キャッシュ更新 ──
  credentialsCache.set(secretId, { credentials });

  return buildAuthHeader(credentials);
};

const buildAuthHeader = (
  credentials: Record<string, string>,
): Record<string, string> => {
  const accessToken = credentials["access_token"];
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
};
