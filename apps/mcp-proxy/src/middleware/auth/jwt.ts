import { jwk } from "hono/jwk";
import type { MiddlewareHandler } from "hono";
import { logInfo } from "../../libs/logger/index.js";

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
 * 開発環境用: JWT 認証バイパスミドルウェア
 *
 * DEV_MODE=true の場合、JWT 認証をスキップしてダミーペイロードを設定
 */
export const devKeycloakAuth: MiddlewareHandler = async (c, next) => {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_MODE === "true"
  ) {
    logInfo("Dev mode: Bypassing JWT authentication");

    // ダミーの JWT ペイロード
    c.set("jwtPayload", {
      sub: "dev-user-id",
      azp: "dev-client-id",
      scope: "mcp:access:*",
      organization_id: "dev-org-id",
    });

    await next();
    return;
  }

  // 本番環境では keycloakAuth を使用
  return keycloakAuth(c, next);
};
