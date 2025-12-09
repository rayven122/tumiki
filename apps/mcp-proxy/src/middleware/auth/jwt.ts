import { jwk } from "hono/jwk";
import type { MiddlewareHandler } from "hono";

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
