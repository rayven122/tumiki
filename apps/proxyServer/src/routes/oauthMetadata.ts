import type { Request, Response } from "express";
import { getAuth0Config } from "../lib/auth0Config.js";
import { logger } from "../lib/logger.js";

/**
 * OAuth 2.0 Authorization Server Metadata endpoint
 * GET /.well-known/oauth-authorization-server
 * 
 * Required for MCP authentication discovery
 */
export const handleOAuthMetadata = (req: Request, res: Response): void => {
  try {
    const auth0Config = getAuth0Config();
    
    if (!auth0Config) {
      res.status(503).json({
        error: "OAuth Authorization Server not configured",
      });
      return;
    }

    const baseUrl = auth0Config.baseUrl || `${req.protocol}://${req.get('host')}`;
    
    const metadata = {
      issuer: auth0Config.domain,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
      jwks_uri: `${auth0Config.domain}/.well-known/jwks.json`,
      registration_endpoint: undefined, // Auth0 doesn't support dynamic client registration
      scopes_supported: [
        "openid",
        "profile", 
        "email",
        "offline_access",
        "read",
        "write",
      ],
      response_types_supported: [
        "code",
      ],
      response_modes_supported: [
        "query",
        "fragment",
      ],
      grant_types_supported: [
        "authorization_code",
        "client_credentials",
        "refresh_token",
      ],
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
      ],
      code_challenge_methods_supported: [
        "S256",
      ],
      subject_types_supported: [
        "public",
      ],
      id_token_signing_alg_values_supported: [
        "RS256",
      ],
      claims_supported: [
        "sub",
        "email",
        "email_verified",
        "name",
        "preferred_username",
        "picture",
        "updated_at",
      ],
      service_documentation: "https://docs.anthropic.com/en/docs/claude-code", // MCP documentation
      
      // MCP-specific extensions
      mcp_support: true,
      mcp_version: "2025-06-18",
      mcp_endpoints: {
        transport: `${baseUrl}/mcp`,
        sse: `${baseUrl}/sse`,
      },
    };

    logger.debug("OAuth Authorization Server metadata requested", {
      userAgent: req.headers["user-agent"],
      clientIp: req.ip,
    });

    res.json(metadata);
  } catch (error) {
    logger.error("OAuth metadata error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "Internal server error",
    });
  }
};