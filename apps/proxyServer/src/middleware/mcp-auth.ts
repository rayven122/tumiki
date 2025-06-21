import type { Request, Response, NextFunction } from "express";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { nextAuthOAuthVerifier, type MCPAuthInfo } from "../auth/oauth-verifier.js";
import type { AuthenticatedRequest } from "../types/auth.js";

/**
 * MCP準拠の認証ミドルウェア
 * Bearer tokenとNextAuthセッションの両方をサポート
 */
export function requireMCPAuth(options: {
  requiredScopes?: string[];
  resourceMetadataUrl?: string;
} = {}) {
  const { requiredScopes = [], resourceMetadataUrl } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // まずMCP標準のBearerAuth を試行
      const authHeader = req.headers.authorization;
      
      if (authHeader?.startsWith("Bearer ")) {
        // Bearer tokenが存在する場合、MCP標準の認証を使用
        const mcpAuthMiddleware = requireBearerAuth({
          verifier: nextAuthOAuthVerifier,
          requiredScopes,
          resourceMetadataUrl,
        });
        
        return mcpAuthMiddleware(req, res, next);
      }

      // Bearer tokenがない場合、NextAuthセッションを確認
      const authInfo = await nextAuthOAuthVerifier.verifyRequestAuth(req);
      
      if (!authInfo) {
        // WWW-Authenticate ヘッダーを設定
        const wwwAuthValue = resourceMetadataUrl
          ? `Bearer error="invalid_token", error_description="No valid session found", resource_metadata="${resourceMetadataUrl}"`
          : `Bearer error="invalid_token", error_description="No valid session found"`;
        
        res.set("WWW-Authenticate", wwwAuthValue);
        res.status(401).json({
          error: "invalid_token",
          error_description: "No valid session found. Please authenticate first.",
          authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
        });
        return;
      }

      // スコープチェック
      if (requiredScopes.length > 0) {
        const hasAllScopes = requiredScopes.every(scope => 
          authInfo.scopes.includes(scope)
        );
        
        if (!hasAllScopes) {
          const wwwAuthValue = resourceMetadataUrl
            ? `Bearer error="insufficient_scope", error_description="Insufficient scope", resource_metadata="${resourceMetadataUrl}"`
            : `Bearer error="insufficient_scope", error_description="Insufficient scope"`;
          
          res.set("WWW-Authenticate", wwwAuthValue);
          res.status(403).json({
            error: "insufficient_scope",
            error_description: "Insufficient scope",
          });
          return;
        }
      }

      // トークン有効期限チェック
      if (authInfo.expiresAt && authInfo.expiresAt < Date.now() / 1000) {
        const wwwAuthValue = resourceMetadataUrl
          ? `Bearer error="invalid_token", error_description="Token has expired", resource_metadata="${resourceMetadataUrl}"`
          : `Bearer error="invalid_token", error_description="Token has expired"`;
        
        res.set("WWW-Authenticate", wwwAuthValue);
        res.status(401).json({
          error: "invalid_token",
          error_description: "Token has expired",
        });
        return;
      }

      // MCPとNextAuth両方の認証情報をリクエストに追加
      (req as any).auth = authInfo;
      (req as AuthenticatedRequest).user = nextAuthOAuthVerifier.mcpAuthToUser(authInfo);
      
      next();
    } catch (error) {
      console.error("MCP authentication error:", error);
      res.status(500).json({
        error: "server_error",
        error_description: "Internal Server Error",
      });
    }
  };
}

/**
 * NextAuthセッションのみの軽量認証ミドルウェア
 * 後方互換性のため
 */
export async function requireNextAuthSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authInfo = await nextAuthOAuthVerifier.verifyRequestAuth(req);
    
    if (!authInfo) {
      res.status(401).json({
        error: "Unauthorized",
        message: "No valid session found. Please authenticate first.",
        authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
      });
      return;
    }

    (req as AuthenticatedRequest).user = nextAuthOAuthVerifier.mcpAuthToUser(authInfo);
    next();
  } catch (error) {
    console.error("NextAuth session verification failed:", error);
    res.status(401).json({
      error: "Authentication failed",
      message: "Session verification failed. Please re-authenticate.",
    });
  }
}