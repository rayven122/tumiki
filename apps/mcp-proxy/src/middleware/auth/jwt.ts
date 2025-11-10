import { jwk } from "hono/jwk";
import type { MiddlewareHandler } from "hono";
import { logInfo, logWarn } from "../../libs/logger/index.js";

/**
 * Keycloak JWT 認証ミドルウェア
 *
 * Hono の標準 JWK ミドルウェアを使用して JWT を検証
 * - JWKS エンドポイントから公開鍵を自動取得
 * - 署名検証、有効期限チェックを自動実行
 * - JWT ペイロードを `c.get('jwtPayload')` で取得可能
 *
 * 環境変数:
 * - KEYCLOAK_ISSUER: Keycloak Issuer URL (例: https://keycloak.example.com/realms/master)
 */
export const keycloakAuth: MiddlewareHandler = jwk({
  // JWKS エンドポイント（Keycloak の公開鍵）
  jwks_uri: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
  // 匿名アクセス不可
  allow_anon: false,
});

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
    c.set("jwtPayload", {
      sub: "dev-user-id",
      azp: "dev-client-id",
      scope: "mcp:access:*",
      tumiki: {
        org_id: "dev-org-id",
        is_org_admin: true,
        tumiki_user_id: "dev-user-db-id",
        mcp_instance_id: "dev-mcp-instance-id",
      },
    });

    await next();
    return;
  }

  // 本番環境または条件を満たさない場合は keycloakAuth を使用
  logInfo("Using production JWT authentication");
  return keycloakAuth(c, next);
};
