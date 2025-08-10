import type { Request, Response } from "express";
import { setCorsHeaders } from "../../libs/corsConfig.js";

/**
 * OAuth 2.0 Protected Resource Metadata
 * For resource-specific OAuth discovery
 * /.well-known/oauth-protected-resource
 */
export const handleOAuthProtectedResource = (
  req: Request,
  res: Response,
): void => {
  // CORSヘッダーを設定
  setCorsHeaders(req, res, { allowAllIfNoOrigin: true });

  const baseUrl = process.env.MCP_PROXY_URL || "http://localhost:8080";

  // Resource-specific OAuth metadata
  const metadata = {
    // Resource server information
    resource: baseUrl,

    // Authorization server endpoints (simplified for resource)
    authorization_server: `${baseUrl}/.well-known/oauth-authorization-server`,

    // Direct endpoints for this resource
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,

    // Supported authentication methods
    token_endpoint_auth_methods_supported: ["client_secret_post"],

    // Grant types supported
    grant_types_supported: ["authorization_code", "client_credentials"],

    // Scopes available for this resource
    scopes_supported: [
      "mcp:access",
      "openid",
      "profile",
      "email",
      "offline_access",
    ],

    // Response types
    response_types_supported: ["code", "token"],
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(metadata);
};
