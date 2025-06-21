import { Router } from "express";
import type { Request, Response } from "express";
import { authWithJWT } from "../middleware/auth";
import { requireMCPAuth, requireNextAuthSession } from "../middleware/mcp-auth.js";
import type { AuthenticatedWithJWTRequest, MCPAuthenticatedRequest } from "../types/auth";

const router = Router();

// MCP準拠の認証エンドポイント
router.get("/userinfo", requireMCPAuth(), (req: Request, res: Response) => {
  const authenticatedReq = req as unknown as MCPAuthenticatedRequest;
  const { auth, user } = authenticatedReq;

  // OAuth 2.0 UserInfo Response 形式
  res.json({
    sub: auth.subject,
    email: user.email,
    name: user.name,
    role: user.role,
    iss: auth.issuer,
    aud: "mcp-proxy-server",
    iat: Math.floor(Date.now() / 1000),
    scope: auth.scopes.join(" "),
  });
});

// MCP準拠のトークン検証エンドポイント
router.get("/introspect", requireMCPAuth(), (req: Request, res: Response) => {
  const authenticatedReq = req as unknown as MCPAuthenticatedRequest;
  const { auth } = authenticatedReq;

  // RFC 7662 OAuth 2.0 Token Introspection Response
  res.json({
    active: true,
    scope: auth.scopes.join(" "),
    client_id: "mcp-proxy-server",
    sub: auth.subject,
    iss: auth.issuer,
    exp: auth.expiresAt,
    iat: Math.floor(Date.now() / 1000),
    token_type: "Bearer",
  });
});

// 既存のエンドポイント（後方互換性）
router.get("/token", authWithJWT, (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedWithJWTRequest;
  const { jwt, user } = authenticatedReq;

  res.json({
    success: true,
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expiresIn: "24h",
  });
});

router.get("/verify", requireNextAuthSession, (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedWithJWTRequest;
  const { user } = authenticatedReq;

  res.json({
    success: true,
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

export default router;
