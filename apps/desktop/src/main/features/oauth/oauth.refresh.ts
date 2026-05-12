/**
 * OAuth トークンリフレッシュ
 *
 * access_token の有効期限をチェックし、期限切れまたは期限間近の場合に
 * refresh_token を使って自動的にトークンをリフレッシュする。
 * リフレッシュ後の新しいcredentialsはDBに暗号化保存される。
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
import { buildReauthDeepLink } from "../../../shared/oauth/deeplink";

/**
 * needsReauth=true の secret に対して `resolveOAuthHeaders` から投げる専用エラー。
 * このメッセージは MCP SDK 経由でそのまま AI クライアントのツール呼び出しエラーになるため、
 * 人間可読 + Markdown ディープリンクで構成して再認証導線を示す。
 */
export class OAuthReauthRequiredError extends Error {
  constructor(connectionId: number) {
    const deepLink = buildReauthDeepLink(connectionId);
    super(
      `OAuth認証の有効期限が切れました。Tumikiで再認証してください。\n\n👉 [Tumikiで再認証する](${deepLink})`,
    );
    this.name = "OAuthReauthRequiredError";
  }
}

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
  // oauth4webapi の ResponseBodyError は 4xx + error フィールドを保持しているのが特徴
  if (error instanceof oauth.ResponseBodyError) {
    if (FATAL_OAUTH_ERROR_CODES.has(error.error)) return "FATAL";
    // 4xx で error コード未一致でも、サーバーが明示的に拒否しているため FATAL 寄り
    if (error.status >= 400 && error.status < 500) return "FATAL";
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

const credentialsSchema = z.record(z.string(), z.string());

/**
 * 実行中のリフレッシュ Promise を secretId 単位でキャッシュし、同一 secret の並行リフレッシュを防止する。
 * 現在は secretId が MCP サーバーごとに一意なためキーは secretId のみで十分。
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
 */
export const refreshOAuthTokenIfNeededOnce = async (
  secretId: number,
  serverUrl: string,
  credentials: Record<string, string>,
): Promise<Record<string, string> | null> => {
  const existing = inflightRefreshes.get(secretId);
  if (existing) return existing;

  const promise = refreshOAuthTokenIfNeeded(
    secretId,
    serverUrl,
    credentials,
  ).finally(() => inflightRefreshes.delete(secretId));

  inflightRefreshes.set(secretId, promise);
  return promise;
};

/**
 * DB から最新の credentials を読み込み、必要ならリフレッシュし、
 * Authorization ヘッダーを返す。mcp-core-proxy の resolveHeaders コールバックとして使用する。
 *
 * `connectionId` は再認証ディープリンク埋め込み用。同じ secret を複数のコネクトが共有していても、
 * AI クライアント側からはどれか1つの connectionId 経由で再認証モーダルを開ければ十分なので
 * 呼び出し元のコネクトの id を渡す。
 *
 * needsReauth=true の secret は OAuthReauthRequiredError を投げる。これにより
 * MCP SDK 経由で AI クライアントのツール呼び出しエラーとして「再認証してください」が表示される。
 */
export const resolveOAuthHeaders = async (
  secretId: number,
  serverUrl: string,
  connectionId: number,
): Promise<Record<string, string>> => {
  const db = await getDb();
  const secret = await oauthRepository.findSecretWithReauthState(db, secretId);
  if (!secret) {
    logger.warn("McpSecret が見つかりません", { secretId });
    return {};
  }

  if (secret.needsReauth) {
    // 既に再認証が必要だと分かっているので、無駄に upstream を叩かず即座にエラーを返す。
    // メッセージは AI クライアントが Markdown としてレンダリングする想定で組み立てている。
    throw new OAuthReauthRequiredError(connectionId);
  }

  let rawJson: unknown;
  try {
    const plain = await decryptCredentials(secret.credentials);
    rawJson = JSON.parse(plain);
  } catch {
    logger.warn("credentials の復号またはJSONパースに失敗しました", {
      secretId,
    });
    return {};
  }
  const parsed = credentialsSchema.safeParse(rawJson);
  if (!parsed.success) {
    logger.warn("credentials の形式が不正です", { secretId });
    return {};
  }

  let credentials = parsed.data;
  const refreshed = await refreshOAuthTokenIfNeededOnce(
    secretId,
    serverUrl,
    credentials,
  );
  if (refreshed) credentials = refreshed;

  // refresh が FATAL で失敗していると markSecretNeedsReauth が呼ばれているので、
  // ここで再度フラグを読み直して、即座に再認証エラーを投げる。
  const post = await oauthRepository.findSecretWithReauthState(db, secretId);
  if (post?.needsReauth) {
    throw new OAuthReauthRequiredError(connectionId);
  }

  const accessToken = credentials["access_token"];
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
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
