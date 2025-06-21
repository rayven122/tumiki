import type { Request, Response, NextFunction } from "express";
import { getNextAuthToken, generateJWT, type AuthUser } from "@tumiki/auth";
import type { AuthenticatedRequest, AuthenticatedWithJWTRequest } from "../types/auth";

async function verifyNextAuthSession(req: Request): Promise<AuthUser | null> {
  try {
    // Express Request型をgetNextAuthTokenが期待する型に適応
    const adaptedReq = {
      headers: req.headers as Record<string, string>,
      cookies: req.cookies,
    };
    
    const token = await getNextAuthToken(adaptedReq);

    if (!token) {
      return null;
    }

    return {
      id: token.sub!,
      email: token.email || undefined,
      name: token.name || undefined,
      role: token.role,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await verifyNextAuthSession(req);

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "No valid session found. Please authenticate first.",
        authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
      });
      return;
    }

    // 型安全な方法でユーザー情報を設定
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      error: "Invalid token",
      message: "Session verification failed. Please re-authenticate.",
      authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
    });
  }
}

export async function authWithJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await verifyNextAuthSession(req);

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
        authUrl: `${process.env.MANAGER_URL || "http://localhost:3000"}/api/auth/signin`,
      });
      return;
    }

    const jwt = await generateJWT(user);

    // 型安全な方法でユーザー情報とJWTを設定
    const authenticatedReq = req as AuthenticatedWithJWTRequest;
    authenticatedReq.user = user;
    authenticatedReq.jwt = jwt;

    res.setHeader("X-Auth-Token", jwt);
    next();
  } catch (error) {
    console.error("JWT generation error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to generate authentication token",
    });
  }
}
