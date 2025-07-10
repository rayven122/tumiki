import type { Request, Response, NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { getAuth0Config } from "../lib/auth0Config.js";
import { logger } from "../lib/logger.js";

// Extend Express Request type for Auth0 JWT
declare module "express-serve-static-core" {
  interface Request {
    auth0Jwt?: {
      isAuthenticated: boolean;
      user?: {
        sub: string;
        email?: string;
        name?: string;
        [key: string]: unknown;
      };
      scopes: string[];
      clientId?: string;
    };
    auth?: {
      sub?: string;
      email?: string;
      name?: string;
      scope?: string;
      client_id?: string;
      [key: string]: unknown;
    };
  }
}

let checkJwtMiddleware: ReturnType<typeof auth> | null = null;

/**
 * Initialize Auth0 JWT middleware
 */
export const initializeAuth0Jwt = (): boolean => {
  const auth0Config = getAuth0Config();

  if (!auth0Config || !auth0Config.audience) {
    logger.warn(
      "Auth0 configuration not complete - JWT authentication will be disabled",
      {
        hasConfig: !!auth0Config,
        hasAudience: !!auth0Config?.audience,
      },
    );
    return false;
  }

  try {
    checkJwtMiddleware = auth({
      audience: auth0Config.audience,
      issuerBaseURL: auth0Config.domain,
    });

    logger.info("Auth0 JWT middleware initialized successfully", {
      audience: auth0Config.audience,
      issuer: auth0Config.domain,
    });

    return true;
  } catch (error) {
    logger.error("Failed to initialize Auth0 JWT middleware", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

/**
 * Auth0 JWT authentication middleware (non-blocking)
 * Populates req.auth0Jwt with authentication context
 */
export const auth0JwtMiddleware = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Check if JWT middleware is initialized
      if (!checkJwtMiddleware) {
        req.auth0Jwt = {
          isAuthenticated: false,
          scopes: [],
        };
        return next();
      }

      // Check if there's an Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        req.auth0Jwt = {
          isAuthenticated: false,
          scopes: [],
        };
        logger.debug("No Bearer token found in Authorization header");
        return next();
      }

      // Apply the JWT middleware
      void checkJwtMiddleware(req, res, (err?: unknown) => {
        if (err) {
          logger.error("JWT authentication failed", {
            error: err instanceof Error ? err.message : String(err),
          });

          req.auth0Jwt = {
            isAuthenticated: false,
            scopes: [],
          };
          return next();
        }

        // Extract auth info from req.auth (populated by express-oauth2-jwt-bearer)
        const authInfo = req.auth;

        if (authInfo?.sub) {
          const scopes = authInfo.scope ? authInfo.scope.split(" ") : [];

          req.auth0Jwt = {
            isAuthenticated: true,
            user: {
              sub: authInfo.sub,
              email: authInfo.email,
              name: authInfo.name,
              ...authInfo,
            },
            scopes,
            clientId: authInfo.client_id,
          };

          logger.debug("JWT authentication successful", {
            sub: authInfo.sub,
            clientId: authInfo.client_id,
            scopes,
          });
        } else {
          req.auth0Jwt = {
            isAuthenticated: false,
            scopes: [],
          };
        }

        next();
      });
    } catch (error) {
      logger.error("Auth0 JWT middleware error", {
        error: error instanceof Error ? error.message : String(error),
      });

      req.auth0Jwt = {
        isAuthenticated: false,
        scopes: [],
      };

      next();
    }
  };
};

/**
 * Require Auth0 JWT authentication
 */
export const requireAuth0Jwt = (requiredScopes: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!checkJwtMiddleware) {
      res.status(503).json({
        error: "JWT authentication not configured",
        code: "SERVICE_UNAVAILABLE",
      });
      return;
    }

    void checkJwtMiddleware(req, res, (err?: unknown) => {
      if (err) {
        logger.error("JWT authentication required but failed", {
          error: err instanceof Error ? err.message : String(err),
        });

        res.status(401).json({
          error: "Invalid or expired JWT token",
          code: "UNAUTHORIZED",
        });
        return;
      }

      const authInfo = req.auth;

      if (!authInfo?.sub) {
        res.status(401).json({
          error: "Invalid JWT token - missing subject",
          code: "UNAUTHORIZED",
        });
        return;
      }

      // Check required scopes
      const userScopes = authInfo.scope ? authInfo.scope.split(" ") : [];
      const hasRequiredScopes = requiredScopes.every((scope) =>
        userScopes.includes(scope),
      );

      if (requiredScopes.length > 0 && !hasRequiredScopes) {
        res.status(403).json({
          error: "Insufficient permissions",
          code: "FORBIDDEN",
          required_scopes: requiredScopes,
          user_scopes: userScopes,
        });
        return;
      }

      next();
    });
  };
};

/**
 * Get Auth0 JWT authentication context
 */
export const getAuth0JwtContext = (req: Request) => {
  return req.auth0Jwt || null;
};

/**
 * Check if request has Auth0 JWT authentication
 */
export const isAuth0JwtAuthenticated = (req: Request): boolean => {
  return req.auth0Jwt?.isAuthenticated === true;
};

/**
 * Check if request has specific Auth0 JWT scopes
 */
export const hasAuth0JwtScopes = (
  req: Request,
  ...scopes: string[]
): boolean => {
  const authContext = req.auth0Jwt;
  return (
    authContext?.isAuthenticated === true &&
    scopes.every((scope) => authContext.scopes.includes(scope))
  );
};
