import type { Request, Response, NextFunction } from "express";
import { getAuth0JwtContext } from "./auth0Jwt.js";
import { getApiKeyAuthContext } from "./apiKeyAuth.js";
import { logger } from "../lib/logger.js";

// Unified auth context
export interface UnifiedAuthContext {
  isAuthenticated: boolean;
  authType?: "api-key" | "m2m" | "none";
  userId?: string;
  userMcpServerInstanceId?: string;
  email?: string;
  name?: string;
  scopes?: string[];
  clientId?: string;
}

// Extend Express Request type
declare module "express-serve-static-core" {
  interface Request {
    unifiedAuth?: UnifiedAuthContext;
  }
}

/**
 * Combined authentication middleware
 * Checks both API key and OAuth authentication
 */
export const combinedAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check API key authentication first
      const apiKeyAuth = getApiKeyAuthContext(req);
      if (apiKeyAuth?.isAuthenticated) {
        req.unifiedAuth = {
          isAuthenticated: true,
          authType: "api-key",
          userId: apiKeyAuth.userId,
          userMcpServerInstanceId: apiKeyAuth.userMcpServerInstanceId,
        };

        logger.debug("Unified auth: API key authentication", {
          userId: apiKeyAuth.userId,
        });

        return next();
      }

      // Check Auth0 JWT/M2M authentication
      const auth0Jwt = getAuth0JwtContext(req);
      if (auth0Jwt?.isAuthenticated) {
        req.unifiedAuth = {
          isAuthenticated: true,
          authType: "m2m",
          userId: auth0Jwt.user?.sub,
          email: auth0Jwt.user?.email,
          name: auth0Jwt.user?.name,
          scopes: auth0Jwt.scopes,
          clientId: auth0Jwt.clientId,
        };

        logger.debug("Unified auth: M2M authentication", {
          userId: auth0Jwt.user?.sub,
          clientId: auth0Jwt.clientId,
          scopes: auth0Jwt.scopes,
        });

        return next();
      }

      // No authentication found
      req.unifiedAuth = {
        isAuthenticated: false,
        authType: "none",
      };

      logger.debug("Unified auth: No authentication found");
      next();
    } catch (error) {
      logger.error("Combined auth middleware error", {
        error: error instanceof Error ? error.message : String(error),
      });

      req.unifiedAuth = {
        isAuthenticated: false,
        authType: "none",
      };

      next();
    }
  };
};

/**
 * Require unified authentication
 */
export const requireUnifiedAuth = (
  allowedAuthTypes?: Array<"api-key" | "m2m">,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.unifiedAuth;

    if (!auth?.isAuthenticated) {
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED",
        message: "Please provide valid API key or M2M token",
      });
      return;
    }

    // Check if auth type is allowed
    if (
      allowedAuthTypes &&
      auth.authType &&
      auth.authType !== "none" &&
      !allowedAuthTypes.includes(auth.authType)
    ) {
      res.status(403).json({
        error: "Invalid authentication type",
        code: "FORBIDDEN",
        message: `Authentication type '${auth.authType}' is not allowed. Allowed types: ${allowedAuthTypes.join(", ")}`,
      });
      return;
    }

    next();
  };
};

/**
 * Get unified auth context
 */
export const getUnifiedAuthContext = (
  req: Request,
): UnifiedAuthContext | null => {
  return req.unifiedAuth || null;
};
