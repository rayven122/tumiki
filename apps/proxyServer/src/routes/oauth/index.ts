import type { RequestHandler } from "express";

// OAuth ルートハンドラーをエクスポート
export { handleOAuthAuthorize, handleOAuthStatus } from "./authorize.js";
export { handleOAuthCallback } from "./callback.js";
export { handleOAuthRefresh } from "./refresh.js";
export { handleOAuthRevoke, handleOAuthRevokeAll } from "./revoke.js";

/**
 * OAuth 2.0 Authorization Server Metadata
 * RFC 8414準拠のディスカバリーエンドポイント
 * https://tools.ietf.org/html/rfc8414
 */
export const handleOAuthDiscovery: RequestHandler = (req, res) => {
  const auth0Domain = process.env.AUTH0_DOMAIN;
  const auth0M2MDomain = process.env.AUTH0_M2M_DOMAIN;

  // CORSヘッダーを設定
  const allowedOrigins = [
    "http://localhost:3000",
    "https://local.tumiki.cloud:3000",
    "http://localhost:6274", // MCP Inspector
    "http://localhost:8080",
    "http://local-server.tumiki.cloud:8080",
    "https://server.tumiki.cloud",
    "https://tumiki.cloud",
    "https://www.tumiki.cloud",
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin && process.env.NODE_ENV !== "production") {
    // 開発環境では、localhostの任意のポートを許可
    const localhostPattern = /^http:\/\/localhost:\d+$/;
    if (localhostPattern.test(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  } else if (!origin) {
    // originヘッダーがない場合（サーバー間通信など）は許可
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // 環境変数が設定されていない場合はエラーを返す
  if (!auth0Domain || !auth0M2MDomain) {
    res.status(503).json({
      error: "OAuth configuration not available",
      message: "Auth0 domains are not configured",
    });
    return;
  }

  // OAuth 2.0 Authorization Server Metadata
  const metadata = {
    // 発行者識別子
    issuer: `https://${auth0M2MDomain}/`,

    // 認可エンドポイント
    authorization_endpoint: `https://${auth0M2MDomain}/authorize`,

    // トークンエンドポイント
    token_endpoint: `https://${auth0M2MDomain}/oauth/token`,

    // ユーザー情報エンドポイント
    userinfo_endpoint: `https://${auth0M2MDomain}/userinfo`,

    // JWKSエンドポイント（公開鍵の取得用）
    jwks_uri: `https://${auth0M2MDomain}/.well-known/jwks.json`,

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
    device_authorization_endpoint: `https://${auth0M2MDomain}/oauth/device/code`,
    mfa_challenge_endpoint: `https://${auth0M2MDomain}/mfa/challenge`,
    revocation_endpoint: `https://${auth0M2MDomain}/oauth/revoke`,
    end_session_endpoint: `https://${auth0M2MDomain}/v2/logout`,

    // Tumiki固有の拡張
    tumiki_api_audience: `https://${auth0Domain}/api`,
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
export const handleOpenIDConfiguration: RequestHandler = (req, res, next) => {
  // OAuth Discoveryと同じ内容を返す（OpenID Connect互換）
  handleOAuthDiscovery(req, res, next);
};
