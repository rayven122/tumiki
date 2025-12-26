import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { getKeycloakIssuer } from "../libs/auth/keycloak.js";
import { getMcpServerOrganization } from "../services/mcpServerService.js";

export const wellKnownRoute = new Hono<HonoEnv>();

/**
 * RFC 8414 - OAuth 2.0 Authorization Server Metadata（ルートレベル）
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8414
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
 *
 * MCP Proxy 全体の認可サーバーメタデータを提供。
 * MCPクライアントはこのエンドポイントからOAuth設定を自動検出する。
 *
 * 注意: DEV_MODE チェックなし（常に有効）
 */
wellKnownRoute.get("/oauth-authorization-server", async (c) => {
  const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
  const mcpProxyUrl =
    process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";

  if (!keycloakIssuerUrl) {
    return c.json(
      {
        error: "server_misconfiguration",
        error_description:
          "KEYCLOAK_ISSUER environment variable is not set. Please configure Keycloak integration.",
      },
      500,
    );
  }

  // Keycloak メタデータを取得
  const keycloakIssuer = await getKeycloakIssuer();

  // RFC 8414 準拠の Authorization Server Metadata を返却
  return c.json({
    issuer: mcpProxyUrl,
    authorization_endpoint: keycloakIssuer.metadata.authorization_endpoint,
    token_endpoint: `${mcpProxyUrl}/oauth/token`,
    registration_endpoint: `${mcpProxyUrl}/oauth/register`,
    jwks_uri: keycloakIssuer.metadata.jwks_uri,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
    ],
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
    ],
    code_challenge_methods_supported: ["S256"],
  });
});

/**
 * RFC 9728 - OAuth 2.0 Protected Resource Metadata（ルートレベル）
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
 *
 * MCP Proxy 全体のリソースメタデータを提供。
 * MCPクライアントはこのエンドポイントから認証に必要な情報を自動検出する。
 *
 * 注意: DEV_MODE チェックなし（常に有効）
 */
wellKnownRoute.get("/oauth-protected-resource", (c) => {
  const mcpProxyUrl =
    process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";
  const mcpResourceUrl = process.env.MCP_RESOURCE_URL ?? `${mcpProxyUrl}/mcp`;

  // RFC 9728 準拠のリソースメタデータを返す
  return c.json({
    resource: mcpResourceUrl,
    authorization_servers: [mcpProxyUrl],
    scopes_supported: [],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://docs.tumiki.cloud/mcp",
    resource_signing_alg_values_supported: ["RS256"],
  });
});

/**
 * RFC 8414 - OAuth 2.0 Authorization Server Metadata (Instance-specific)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8414
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
 *
 * Keycloak OAuth 2.1 Authorization Server Metadataへのリダイレクト
 *
 * このエンドポイントは、AI クライアントが MCP Proxy の OAuth 設定を
 * 自動検出できるようにするためのものです。
 *
 * Keycloakが認証・認可を担当するため、Keycloak の OpenID Connect
 * 設定エンドポイントにリダイレクトします。
 *
 * Keycloak の OpenID Connect Discovery エンドポイント:
 * {KEYCLOAK_ISSUER}/.well-known/openid-configuration
 *
 * 注意事項：
 * - Keycloakでは Client Credentials Grant をサポート
 * - カスタムクレーム (tumiki.org_id) の設定が必要
 * - mcp_instance_id は URL パスから取得
 * - Instance ID ごとに異なる認可サーバー設定を返す予定（現在は TODO）
 */
wellKnownRoute.get(
  "/oauth-authorization-server/mcp/:devInstanceId",
  async (c) => {
    const devMode = process.env.DEV_MODE === "true";

    // DEV_MODE 以外は未実装
    if (!devMode) {
      // TODO: Implement instance-specific authorization server discovery
      // - Fetch instance-specific Keycloak realm or authorization server URL from database
      // - Support multiple authorization servers per instance
      // - Handle instance-not-found scenarios
      return c.json(
        {
          error: "not_implemented",
          error_description:
            "Instance-specific OAuth authorization server metadata is not yet implemented",
        },
        501,
      );
    }

    // DEV_MODE: JSON メタデータを返却
    const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
    const mcpProxyUrl =
      process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";

    if (!keycloakIssuerUrl) {
      return c.json(
        {
          error: "server_misconfiguration",
          error_description:
            "KEYCLOAK_ISSUER environment variable is not set. Please configure Keycloak integration.",
        },
        500,
      );
    }

    // Keycloak メタデータを取得
    const keycloakIssuer = await getKeycloakIssuer();

    // RFC 8414 準拠の Authorization Server Metadata を返却
    // mcp-proxy の token/register エンドポイントを使用
    return c.json({
      // 必須フィールド
      issuer: mcpProxyUrl,

      // Keycloak のエンドポイントを使用（認可フロー）
      authorization_endpoint: keycloakIssuer.metadata.authorization_endpoint,

      // mcp-proxy のエンドポイントを使用
      token_endpoint: `${mcpProxyUrl}/oauth/token`,
      registration_endpoint: `${mcpProxyUrl}/oauth/register`,

      // Keycloak の JWKS を使用
      jwks_uri: keycloakIssuer.metadata.jwks_uri,

      // サポートする機能
      response_types_supported: ["code"],
      grant_types_supported: [
        "authorization_code",
        "refresh_token",
        "client_credentials",
      ],
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
      ],
      code_challenge_methods_supported: ["S256"],
    });
  },
);

/**
 * RFC 9728 - OAuth 2.0 Protected Resource Metadata (Instance-specific)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
 *
 * MCP仕様準拠: 保護されたリソース（MCP Proxy）のメタデータを提供
 *
 * このエンドポイントは、MCP クライアントが認証に必要な情報を
 * 自動検出できるようにするためのものです。
 *
 * 重要:
 * - 認証は不要（公開メタデータ）
 * - RFC 9728 に準拠したリソースメタデータを返す
 * - MCP 2025-DRAFT-v2 仕様で必須実装
 * - データベースから McpServer の存在確認を行う
 */
wellKnownRoute.get("/oauth-protected-resource/mcp/:mcpServerId", async (c) => {
  const keycloakIssuer = process.env.KEYCLOAK_ISSUER;
  const mcpProxyUrl =
    process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? "http://localhost:8080";
  const mcpResourceUrl = process.env.MCP_RESOURCE_URL ?? `${mcpProxyUrl}/mcp`;

  if (!keycloakIssuer) {
    return c.json(
      {
        error: "server_misconfiguration",
        error_description:
          "KEYCLOAK_ISSUER environment variable is not set. Please configure Keycloak integration.",
      },
      500,
    );
  }

  // URL パスパラメータから mcpServerId を取得
  const mcpServerId = c.req.param("mcpServerId");

  // データベースから McpServer の存在確認
  const mcpServer = await getMcpServerOrganization(mcpServerId);
  if (!mcpServer) {
    return c.json(
      {
        error: "not_found",
        error_description: `MCP Server not found: ${mcpServerId}`,
      },
      404,
    );
  }

  // authType が OAUTH でない場合は OAuth メタデータを返さない
  // これにより、OAuth 非対応のサーバーへの DCR を防止する
  if (mcpServer.authType !== "OAUTH") {
    return c.json(
      {
        error: "oauth_not_supported",
        error_description:
          "This MCP Server does not support OAuth authentication. DCR is not available.",
      },
      404,
    );
  }

  const resourceWithMcpServerId = `${mcpResourceUrl}/${mcpServerId}`;

  // RFC 9728 準拠のリソースメタデータを返す
  return c.json({
    // RFC 9728 必須フィールド
    resource: resourceWithMcpServerId,
    authorization_servers: [keycloakIssuer],

    // RFC 9728 推奨フィールド
    scopes_supported: [],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://docs.tumiki.cloud/mcp",
    resource_signing_alg_values_supported: ["RS256"],
  });
});
