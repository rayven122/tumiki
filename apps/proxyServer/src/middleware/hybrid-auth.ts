import type { Request, Response, NextFunction } from "express";
import { requireMCPAuth } from "./mcp-auth.js";
import { requireAuthWithRedirect } from "./auth-redirect.js";
import type { AuthenticatedRequest, MCPAuthenticatedRequest } from "../types/auth.js";

/**
 * ハイブリッド認証ミドルウェア
 * Bearer tokenとNextAuthセッションの両方をサポート
 * SSEクライアント用に最適化されている
 */
export function requireHybridAuth(options: {
  requiredScopes?: string[];
  resourceMetadataUrl?: string;
  enableRedirect?: boolean;
} = {}) {
  const { requiredScopes = [], resourceMetadataUrl, enableRedirect = true } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const acceptHeader = req.headers.accept || "";

    // Bearer tokenが存在する場合、MCP準拠の認証を使用
    if (authHeader?.startsWith("Bearer ")) {
      console.log("Using MCP Bearer token authentication");
      const mcpAuthMiddleware = requireMCPAuth({
        requiredScopes,
        resourceMetadataUrl,
      });
      return mcpAuthMiddleware(req, res, next);
    }

    // Bearer tokenがない場合、NextAuthセッション認証を使用
    console.log("Using NextAuth session authentication");
    
    if (enableRedirect && !acceptHeader.includes("text/event-stream")) {
      // ブラウザからのアクセスの場合、リダイレクト機能を使用
      return requireAuthWithRedirect(req, res, next);
    } else {
      // SSEクライアントからのアクセスの場合、リダイレクトなしで401を返す
      return requireAuthWithRedirect(req, res, next);
    }
  };
}

/**
 * 認証情報を統一的に取得するヘルパー関数
 */
export function getUnifiedAuthInfo(req: Request): {
  user: AuthenticatedRequest["user"];
  authType: "bearer" | "session";
  mcpAuth?: MCPAuthenticatedRequest["auth"];
} {
  const mcpReq = req as unknown as MCPAuthenticatedRequest;
  const authReq = req as unknown as AuthenticatedRequest;

  if (mcpReq.auth) {
    return {
      user: authReq.user,
      authType: "bearer",
      mcpAuth: mcpReq.auth,
    };
  }

  return {
    user: authReq.user,
    authType: "session",
  };
}