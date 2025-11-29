import type { Context } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { Issuer } from "openid-client";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { logError, logDebug } from "../../libs/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
} from "../../libs/error/index.js";
import { checkPermission } from "../../services/permissionService.js";

/**
 * Keycloak OAuth JWT認証情報
 *
 * Keycloakで発行されたOAuth JWTから取得した認証情報
 */
export type KeycloakOAuthAuthInfo = {
  clientId: string; // OAuth client_id (azp クレーム)
  organizationId: string; // 組織ID
  instanceId: string; // MCPサーバーインスタンスID
  scope?: string; // スコープ
};

/**
 * Keycloak JWT ペイロード型定義
 *
 * Keycloakの標準クレーム + Tumikiカスタムクレーム
 *
 * 注意: mcp_instance_id はJWTに含めず、URLパスから取得する
 */
type KeycloakJWTPayload = {
  sub: string; // Subject (ユーザーID or クライアントID)
  azp: string; // Authorized party (クライアントID)
  iss: string; // Issuer
  aud: string | string[]; // Audience
  exp: number; // 有効期限
  iat: number; // 発行時刻
  scope?: string; // スコープ
  tumiki?: {
    org_id?: string; // 組織ID（必須）
  };
};

/**
 * Keycloak Issuer のキャッシュ
 *
 * パフォーマンス最適化のため、Issuer discovery の結果をキャッシュ
 */
let keycloakIssuerCache: Issuer | null = null;

/**
 * Keycloak Issuer を取得（キャッシュ付き）
 *
 * openid-client の Issuer.discover() を使用して
 * Keycloak の OAuth/OIDC メタデータを自動取得
 */
const getKeycloakIssuer = async (): Promise<Issuer> => {
  if (!keycloakIssuerCache) {
    const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
    if (!keycloakIssuerUrl) {
      throw new Error("KEYCLOAK_ISSUER environment variable is not set");
    }

    // Issuer Discovery（自動メタデータ取得）
    keycloakIssuerCache = await Issuer.discover(keycloakIssuerUrl);

    logDebug("Keycloak Issuer discovered for OAuth", {
      issuer: keycloakIssuerCache.issuer,
      jwksUri: keycloakIssuerCache.metadata.jwks_uri,
      tokenEndpoint: keycloakIssuerCache.metadata.token_endpoint,
    });
  }

  return keycloakIssuerCache;
};

/**
 * JWKS URI をメモ化して取得
 *
 * パフォーマンス最適化のため、RemoteJWKSet をキャッシュ
 */
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

const getJWKS = async () => {
  if (!jwksCache) {
    const issuer = await getKeycloakIssuer();

    if (!issuer.metadata.jwks_uri) {
      throw new Error("JWKS URI not found in Keycloak metadata");
    }

    jwksCache = createRemoteJWKSet(new URL(issuer.metadata.jwks_uri));
  }

  return jwksCache;
};

/**
 * Keycloak OAuth 2.1 Bearer Token認証ミドルウェア
 *
 * Keycloak発行のOAuth JWTを検証:
 * 1. Authorizationヘッダーから Bearer トークンを抽出
 * 2. JWTの署名検証（Keycloak JWKS使用、openid-client + jose）
 * 3. カスタムクレーム（tumiki.org_id）の取得
 * 4. URLパスから mcp_instance_id を取得
 * 5. 権限チェック（MCPサーバーインスタンスへのアクセス権）
 *
 * 注意: mcp_instance_id はJWTに含めず、URLパスから取得する
 *
 * 改善点:
 * - openid-client による自動 Issuer Discovery
 * - クロックスキュー対応（60秒の許容範囲）
 * - より良いエラーハンドリング
 * - JWKS 自動キャッシング・ローテーション
 *
 * MCP準拠要件:
 * - HTTP 401: トークンが無効、期限切れ、形式不正
 * - HTTP 403: 権限不足（スコープ不足、リソースアクセス拒否）
 * - Authorizationヘッダーは必須（クエリパラメータ不可）
 *
 * @param c - Honoコンテキスト
 * @returns エラーレスポンス or undefined（成功時）
 */
export const keycloakOAuthMiddleware = async (
  c: Context<HonoEnv>,
): Promise<Response | void> => {
  try {
    // Step 1: Authorizationヘッダーからトークンを抽出
    const authorization = c.req.header("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return c.json(
        createUnauthorizedError("OAuth authentication required", {
          hint: "Provide Bearer token in Authorization header",
        }),
        401,
      );
    }

    const accessToken = authorization.substring(7); // "Bearer " を除去

    // Step 2: Keycloak Issuer を取得
    const issuer = await getKeycloakIssuer();

    // Step 3: Keycloak JWTの検証（openid-client + jose）
    let payload: KeycloakJWTPayload;
    try {
      const jwks = await getJWKS();
      const { payload: verifiedPayload } = await jwtVerify(accessToken, jwks, {
        issuer: issuer.issuer as string,
        clockTolerance: 60, // 60秒のクロックスキュー許容
      });

      payload = verifiedPayload as unknown as KeycloakJWTPayload;
    } catch (error) {
      logError("Keycloak OAuth token validation failed", error as Error, {
        issuer: issuer.issuer,
        jwksUri: issuer.metadata.jwks_uri,
      });

      // エラーメッセージから原因を判定
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("expired")) {
        return c.json(createUnauthorizedError("Token has expired"), 401);
      }

      if (errorMessage.includes("signature")) {
        return c.json(createUnauthorizedError("Invalid token signature"), 401);
      }

      // その他のエラー（issuer不正など）
      return c.json(createUnauthorizedError("Invalid access token"), 401);
    }

    // Step 4: カスタムクレームの検証
    // Keycloak OAuth では tumiki.org_id が必須
    if (!payload.tumiki?.org_id) {
      logDebug("Keycloak OAuth authentication: Missing org_id claim", {
        clientId: payload.azp,
        hasOrgId: !!payload.tumiki?.org_id,
      });

      return c.json(
        createUnauthorizedError(
          "Invalid OAuth token: Missing required custom claim (tumiki.org_id)",
        ),
        401,
      );
    }

    const organizationId = payload.tumiki.org_id;

    // mcp_instance_id は URL パスから取得
    const instanceId = c.req.param("userMcpServerInstanceId");
    if (!instanceId) {
      return c.json(
        createUnauthorizedError(
          "Instance ID is required in URL path for OAuth authentication",
        ),
        401,
      );
    }

    // Step 5: スコープチェック
    // MCP Proxyへのアクセスには "mcp:access" スコープが必須
    const requiredScope = "mcp:access";
    const scopes = payload.scope?.split(" ") ?? [];

    if (!scopes.includes(requiredScope)) {
      logDebug("Keycloak OAuth authentication: Insufficient scope", {
        clientId: payload.azp,
        requiredScope,
        providedScope: payload.scope,
      });

      return c.json(
        createPermissionDeniedError(
          `Insufficient scope. Required: ${requiredScope}`,
        ),
        403,
      );
    }

    // Step 6: MCPサーバーインスタンスへのアクセス権限チェック
    // OAuth認証の場合、組織レベルでの権限チェックを実施
    try {
      // OAuth Client自体が組織に紐づいているため、組織として権限チェック
      const hasPermission = await checkPermission(
        organizationId, // OAuth Clientの組織ID
        organizationId,
        "MCP_SERVER_INSTANCE",
        "READ",
        instanceId,
      );

      if (!hasPermission) {
        logDebug("Keycloak OAuth authentication: Permission denied", {
          clientId: payload.azp,
          organizationId,
          instanceId,
        });

        return c.json(
          createPermissionDeniedError(
            "Permission denied: READ access to MCP_SERVER_INSTANCE",
          ),
          403,
        );
      }
    } catch (error) {
      logError("Permission check failed, denying access", error as Error);
      return c.json(
        createPermissionDeniedError("Permission check failed"),
        403,
      );
    }

    // Step 7: 認証情報をコンテキストに設定
    const oauthAuthInfo: KeycloakOAuthAuthInfo = {
      clientId: payload.azp,
      organizationId,
      instanceId,
      scope: payload.scope,
    };

    c.set("authMethod", "oauth");
    c.set("oauthAuthInfo", oauthAuthInfo);

    logDebug("Keycloak OAuth authentication successful", {
      clientId: payload.azp,
      organizationId,
      instanceId,
    });

    return undefined; // 成功
  } catch (error) {
    logError("Keycloak OAuth authentication failed", error as Error);
    return c.json(createUnauthorizedError("Authentication failed"), 401);
  }
};
