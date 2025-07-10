import type { Request, Response } from "express";
import { getAuth0Config, getAuth0Endpoints } from "../lib/auth0Config.js";
import { logger } from "../lib/logger.js";


/**
 * OAuth 2.1 Authorization endpoint (deprecated for M2M)
 * GET /oauth/authorize
 *
 * Returns error indicating M2M flow should be used instead
 */
export const handleOAuthAuthorize = (_req: Request, res: Response): void => {
  logger.warn("Authorization Code Flow attempted - M2M flow should be used instead");
  
  res.status(400).json({
    error: "authorization_code_flow_not_supported",
    error_description: "This endpoint only supports Machine-to-Machine authentication. Use the /oauth/token endpoint with grant_type=client_credentials instead.",
    supported_grant_types: ["client_credentials"],
  });
};

/**
 * OAuth 2.1 Callback endpoint (deprecated for M2M)
 * GET /oauth/callback
 *
 * Returns error indicating M2M flow should be used instead
 */
export const handleOAuthCallback = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  logger.warn("Authorization Code Flow callback attempted - M2M flow should be used instead");
  
  res.status(400).json({
    error: "authorization_code_flow_not_supported",
    error_description: "This endpoint only supports Machine-to-Machine authentication. Use the /oauth/token endpoint with grant_type=client_credentials instead.",
    supported_grant_types: ["client_credentials"],
  });
};

/**
 * OAuth 2.1 Token endpoint
 * POST /oauth/token
 *
 * Handles token refresh and client credentials flow
 */
export const handleOAuthToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const auth0Config = getAuth0Config();
    if (!auth0Config) {
      res.status(503).json({
        error: "OAuth service not configured",
      });
      return;
    }

    const { grant_type, client_id, client_secret } =
      req.body as {
        grant_type?: string;
        client_id?: string;
        client_secret?: string;
      };

    if (!grant_type) {
      res.status(400).json({
        error: "Missing grant_type",
      });
      return;
    }

    const endpoints = getAuth0Endpoints(auth0Config.domain);

    const tokenRequest: {
      grant_type: string;
      client_id: string;
      client_secret: string;
      refresh_token?: string;
      audience?: string;
      scope?: string;
    } = {
      grant_type,
      client_id: client_id || auth0Config.clientId,
      client_secret: client_secret || auth0Config.clientSecret,
    };

    if (grant_type === "client_credentials") {
      tokenRequest.audience = auth0Config.audience;
      tokenRequest.scope = auth0Config.scope;
    } else {
      res.status(400).json({
        error: "unsupported_grant_type",
        error_description: "Only client_credentials grant type is supported for M2M authentication.",
        supported_grant_types: ["client_credentials"],
      });
      return;
    }

    const tokenResponse = await fetch(endpoints.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenRequest),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logger.error("Token request failed", {
        status: tokenResponse.status,
        error: errorData,
        grantType: grant_type,
      });

      res.status(tokenResponse.status).json({
        error: "Token request failed",
        details: errorData,
      });
      return;
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
      [key: string]: unknown;
    };

    logger.info("OAuth tokens issued", {
      grantType: grant_type,
    });

    res.json(tokens);
  } catch (error) {
    logger.error("OAuth token error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * OAuth 2.1 User Info endpoint (deprecated for M2M)
 * GET /oauth/userinfo
 *
 * Returns error indicating M2M tokens don't have user info
 */
export const handleOAuthUserInfo = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  logger.warn("User info endpoint accessed - not applicable for M2M authentication");
  
  res.status(400).json({
    error: "user_info_not_supported",
    error_description: "User info endpoint is not supported for Machine-to-Machine authentication. M2M tokens represent applications, not users.",
    token_type: "client_credentials",
  });
};
