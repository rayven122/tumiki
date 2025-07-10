import type { Request, Response, NextFunction } from "express";
import { db } from "@tumiki/db";
import { logger } from "../lib/logger.js";

// Extend Express Request type
declare module "express-serve-static-core" {
  interface Request {
    apiKeyAuth?: {
      isAuthenticated: boolean;
      userId?: string;
      userMcpServerInstanceId?: string;
    };
  }
}

/**
 * Validate API key from various sources
 */
const getApiKey = (req: Request): string | undefined => {
  // Check query parameter (for SSE)
  const queryApiKey = req.query["api-key"] as string | undefined;
  if (queryApiKey) return queryApiKey;
  
  // Check headers
  const headerApiKey = req.headers["api-key"] as string | undefined;
  if (headerApiKey) return headerApiKey;
  
  const xApiKey = req.headers["x-api-key"] as string | undefined;
  if (xApiKey) return xApiKey;
  
  return undefined;
};

/**
 * API Key validation middleware
 */
export const apiKeyAuth = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = getApiKey(req);
      
      if (!apiKey) {
        req.apiKeyAuth = {
          isAuthenticated: false,
        };
        return next();
      }
      
      // Validate API key in database
      const userMcpServerInstance = await db.userMcpServerInstance.findFirst({
        where: {
          apiKeys: {
            some: {
              apiKey: apiKey,
              isActive: true,
            },
          },
        },
        include: {
          user: true,
        },
      });
      
      if (userMcpServerInstance) {
        req.apiKeyAuth = {
          isAuthenticated: true,
          userId: userMcpServerInstance.userId,
          userMcpServerInstanceId: userMcpServerInstance.id,
        };
        
        logger.debug("API key authentication successful", {
          userId: userMcpServerInstance.userId,
          instanceId: userMcpServerInstance.id,
        });
      } else {
        req.apiKeyAuth = {
          isAuthenticated: false,
        };
        
        logger.debug("Invalid API key");
      }
      
      next();
    } catch (error) {
      logger.error("API key authentication error", {
        error: error instanceof Error ? error.message : String(error),
      });
      
      req.apiKeyAuth = {
        isAuthenticated: false,
      };
      
      next();
    }
  };
};

/**
 * Get API key authentication context
 */
export const getApiKeyAuthContext = (req: Request) => {
  return req.apiKeyAuth || null;
};

/**
 * Check if request has API key authentication
 */
export const isApiKeyAuthenticated = (req: Request): boolean => {
  return req.apiKeyAuth?.isAuthenticated === true;
};