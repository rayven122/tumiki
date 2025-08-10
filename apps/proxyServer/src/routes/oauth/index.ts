import type { Request, Response } from "express";
import { setCorsHeaders } from "../../libs/corsConfig.js";
import { auth0Config } from "../../libs/auth0Config.js";

/**
 * OAuth 2.0 Authorization Server Metadata
 * RFC 8414準拠のディスカバリーエンドポイント
 * https://tools.ietf.org/html/rfc8414
 */
export const handleOAuthDiscovery = (req: Request, res: Response): void => {
  // CORSヘッダーを設定
  setCorsHeaders(req, res, { allowAllIfNoOrigin: true });

  // 環境変数が設定されていない場合はエラーを返す
  if (!auth0Config.isConfigured()) {
    res.status(503).json({
      error: "OAuth configuration not available",
      message: "Auth0 domains are not configured",
    });
    return;
  }

  // OAuth 2.0 Authorization Server Metadata
  const metadata = {
    // 発行者識別子（ProxyServerのURL）
    issuer: process.env.MCP_PROXY_URL || "http://localhost:8080",

    // 認可エンドポイント（ローカルプロキシ経由）
    authorization_endpoint: `${
      process.env.MCP_PROXY_URL || "http://localhost:8080"
    }/oauth/authorize`,

    // トークンエンドポイント（ローカルプロキシ経由）
    token_endpoint: `${
      process.env.MCP_PROXY_URL || "http://localhost:8080"
    }/oauth/token`,

    // Dynamic Client Registration エンドポイント (RFC 7591)
    registration_endpoint: `${
      process.env.MCP_PROXY_URL || "http://localhost:8080"
    }/oauth/register`,

    // ユーザー情報エンドポイント
    userinfo_endpoint: auth0Config.endpoints.userinfo,

    // JWKSエンドポイント（公開鍵の取得用）
    jwks_uri: auth0Config.endpoints.jwks,

    // サポートされるレスポンスタイプ
    response_types_supported: [
      "code",
      "token",
      "id_token",
      "code id_token",
      "code token",
      "id_token token",
      "code id_token token",
    ],

    // サポートされる認可フロー
    grant_types_supported: [
      "authorization_code",
      "implicit",
      "refresh_token",
      "client_credentials",
      "password",
      "urn:ietf:params:oauth:grant-type:device_code",
    ],

    // サポートされるトークン認証方法
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
      "private_key_jwt",
    ],

    // サポートされる署名アルゴリズム
    id_token_signing_alg_values_supported: ["RS256"],

    // サポートされるスコープ
    scopes_supported: ["openid", "profile", "email", "offline_access"],

    // サポートされるクレーム
    claims_supported: [
      "aud",
      "auth_time",
      "created_at",
      "email",
      "email_verified",
      "exp",
      "family_name",
      "given_name",
      "iat",
      "identities",
      "iss",
      "name",
      "nickname",
      "phone_number",
      "picture",
      "sub",
    ],

    // サポートされるSubject識別子タイプ
    subject_types_supported: ["public"],

    // サービス文書
    service_documentation: "https://docs.tumiki.cloud/auth",

    // PKCE（Proof Key for Code Exchange）サポート
    code_challenge_methods_supported: ["S256", "plain"],

    // リクエストパラメータサポート
    request_parameter_supported: true,
    request_uri_parameter_supported: false,

    // その他のAuth0固有の設定
    device_authorization_endpoint: auth0Config.endpoints.deviceAuthorization,
    mfa_challenge_endpoint: auth0Config.endpoints.mfaChallenge,
    revocation_endpoint: auth0Config.endpoints.revocation,
    end_session_endpoint: auth0Config.endpoints.logout,

    // Tumiki固有の拡張
    tumiki_api_audience: auth0Config.api.audience,
    tumiki_mcp_endpoint: `${
      process.env.MCP_PROXY_URL || "http://localhost:8080"
    }/mcp`,
  };

  // 適切なContent-Typeを設定
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600"); // 1時間キャッシュ
  res.json(metadata);
};

/**
 * OpenID Connect Discovery Document
 * OpenID Connect Discovery 1.0準拠のエンドポイント
 * https://openid.net/specs/openid-connect-discovery-1_0.html
 */
export const handleOpenIDConfiguration = (
  req: Request,
  res: Response,
): void => {
  // OAuth Discoveryと同じ内容を返す（OpenID Connect互換）
  handleOAuthDiscovery(req, res);
};
