import type { MiddlewareHandler } from "hono";
import { Issuer } from "openid-client";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { logInfo, logWarn, logError } from "../../libs/logger/index.js";

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

    logInfo("Keycloak Issuer discovered", {
      issuer: keycloakIssuerCache.issuer,
      jwksUri: keycloakIssuerCache.metadata.jwks_uri,
    });
  }

  return keycloakIssuerCache;
};

/**
 * JWKS をメモ化して取得
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
 * Keycloak JWT 認証ミドルウェア
 *
 * openid-client と jose を使用して JWT を検証:
 * - openid-client: Issuer Discovery（メタデータ自動取得）
 * - jose: JWT 署名検証、JWKS 自動キャッシング
 * - クロックスキュー対応（60秒の許容範囲）
 * - 自動 JWKS ローテーション対応
 *
 * 環境変数:
 * - KEYCLOAK_ISSUER: Keycloak Issuer URL (例: https://keycloak.example.com/realms/master)
 */
const baseKeycloakAuth: MiddlewareHandler = async (c, next) => {
  try {
    // Step 1: Authorization ヘッダーからトークンを抽出
    const authorization = c.req.header("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return c.json(
        { error: "unauthorized", error_description: "Bearer token required" },
        401,
      );
    }

    const token = authorization.substring(7); // "Bearer " を除去

    // Step 2: Keycloak メタデータを取得
    const issuer = await getKeycloakIssuer();

    // Step 3: JWKS を使用して JWT を検証
    const jwks = await getJWKS();
    const { payload } = await jwtVerify(token, jwks, {
      issuer: issuer.issuer as string,
      clockTolerance: 60, // 60秒のクロックスキュー許容
    });

    // Step 4: JWT ペイロードをコンテキストに設定
    c.set("jwtPayload", payload);

    await next();
  } catch (error) {
    // 認証エラー時の詳細ログ
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const errorObj = error instanceof Error ? error : new Error(String(error));

    logError("JWT authentication failed", errorObj, {
      tokenPreview: token ? `${token.substring(0, 20)}...` : "No token",
      hasAuthHeader: !!authHeader,
      requestPath: c.req.path,
      method: c.req.method,
      keycloakIssuer: process.env.KEYCLOAK_ISSUER,
      errorType: errorObj.message.includes("expired")
        ? "expired"
        : errorObj.message.includes("signature")
          ? "invalid_signature"
          : "unknown",
    });

    // エラーレスポンスを返す
    const errorMessage = errorObj.message;

    if (errorMessage.includes("expired")) {
      return c.json(
        { error: "invalid_token", error_description: "Token has expired" },
        401,
      );
    }

    if (errorMessage.includes("signature")) {
      return c.json(
        {
          error: "invalid_token",
          error_description: "Invalid token signature",
        },
        401,
      );
    }

    return c.json(
      { error: "invalid_token", error_description: "Invalid access token" },
      401,
    );
  }
};

/**
 * JWT認証エラー時の詳細ログ出力を含むミドルウェア
 */
export const keycloakAuth: MiddlewareHandler = baseKeycloakAuth;

/**
 * 開発環境バイパスの判定（セキュリティ強化版）
 *
 * 本番・ステージング環境では絶対にバイパスしない。
 * 開発環境でのみ、以下の条件がすべて真の場合にバイパス:
 * 1. NODE_ENV === "development"
 * 2. ホスト名が厳密なローカルホスト（127.0.0.1, localhost のみ）
 * 3. ENABLE_AUTH_BYPASS === "true" (明示的なバイパス許可)
 * 4. DEV_MODE === "true"
 * 5. FORCE_AUTH !== "true" (強制認証フラグがない)
 */
const shouldBypassAuth = (c: Parameters<MiddlewareHandler>[0]): boolean => {
  // 本番・ステージング環境では絶対にバイパスしない
  if (
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "staging"
  ) {
    return false;
  }

  // 強制認証フラグが設定されている場合はバイパスしない
  if (process.env.FORCE_AUTH === "true") {
    return false;
  }

  // より厳密なホスト名チェック（127.0.0.1とlocalhostのみ許可）
  const url = new URL(c.req.url);
  const isStrictLocalhost = ["127.0.0.1", "localhost"].includes(url.hostname);

  // 開発専用環境変数の追加チェック
  const isDevelopmentBypass =
    process.env.ENABLE_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV === "development";

  // 明示的な開発モードフラグ
  const isDevModeExplicit = process.env.DEV_MODE === "true";

  // すべての条件が真の場合のみバイパス
  return isStrictLocalhost && isDevelopmentBypass && isDevModeExplicit;
};

/**
 * 開発環境用: JWT 認証バイパスミドルウェア
 *
 * セキュリティ強化版:
 * - NODE_ENVチェック（production/stagingでは無効）
 * - ホスト名検証（localhost, 127.0.0.1 のみ）
 * - ENABLE_AUTH_BYPASS 環境変数の明示的チェック
 * - DEV_MODE 環境変数の明示的チェック
 */
export const devKeycloakAuth: MiddlewareHandler = async (c, next) => {
  if (shouldBypassAuth(c)) {
    const url = new URL(c.req.url);
    logWarn("🔓 Development mode: JWT authentication bypassed", {
      hostname: url.hostname,
      devMode: process.env.DEV_MODE,
      nodeEnv: process.env.NODE_ENV,
      authBypass: process.env.ENABLE_AUTH_BYPASS,
    });

    // ダミーの JWT ペイロード（tumiki ネスト構造）
    // mcp_instance_id は URL パスから取得するため含めない
    c.set("jwtPayload", {
      sub: "dev-user-id",
      azp: "dev-client-id",
      scope: "mcp:access:*",
      tumiki: {
        org_id: "dev-org-id",
        is_org_admin: true,
        tumiki_user_id: "dev-user-db-id",
      },
    });

    await next();
    return;
  }

  // 本番環境または条件を満たさない場合は keycloakAuth を使用
  logInfo("Using production JWT authentication");
  return keycloakAuth(c, next);
};
