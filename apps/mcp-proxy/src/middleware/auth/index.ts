import type { Context, Next } from "hono";
import { AuthType } from "@tumiki/db";
import type { HonoEnv } from "../../types/index.js";
import { logInfo } from "../../libs/logger/index.js";
import { AUTH_CONFIG } from "../../constants/config.js";
import { createUnauthorizedError } from "../../libs/error/index.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";

// EE: JWT認証ミドルウェア（条件付きロード）
type JwtAuthMiddleware = (
  c: Context<HonoEnv>,
  next: Next,
) => Promise<Response | void>;
let jwtAuthMiddlewareCache: JwtAuthMiddleware | null = null;

/**
 * JWT認証ミドルウェアを動的ロード
 * CE版では null を返す
 */
const loadJwtMiddleware = async (): Promise<JwtAuthMiddleware | null> => {
  if (jwtAuthMiddlewareCache) {
    return jwtAuthMiddlewareCache;
  }
  try {
    const { jwtAuthMiddleware } = await import("./jwt.ee.js");
    jwtAuthMiddlewareCache = jwtAuthMiddleware;
    return jwtAuthMiddleware;
  } catch {
    return null; // CE版では利用不可
  }
};

/**
 * 認証方式を判定
 *
 * @returns AuthType | null
 */
const detectAuthType = (c: Context<HonoEnv>): AuthType | null => {
  const authorization = c.req.header(AUTH_CONFIG.HEADERS.AUTHORIZATION);
  const xApiKey = c.req.header(AUTH_CONFIG.HEADERS.API_KEY);

  if (authorization?.startsWith(AUTH_CONFIG.PATTERNS.JWT_PREFIX)) {
    return AuthType.OAUTH; // JWT形式（base64エンコードされたJSON）
  }

  if (
    authorization?.startsWith(AUTH_CONFIG.PATTERNS.API_KEY_PREFIX) ||
    xApiKey
  ) {
    return AuthType.API_KEY; // Tumiki APIキー
  }

  return null;
};

/**
 * 認証ミドルウェア
 *
 * Authorization ヘッダーの形式を判定して、適切な認証方法を選択:
 * - `Bearer eyJ...` → OAuth/JWT 認証（Keycloak） [EE機能]
 * - `Bearer tumiki_...` → API Key 認証
 * - `Tumiki-API-Key` ヘッダー → API Key 認証
 * - なし → 401 エラー
 *
 * 各認証メソッドでリクエストパスのmcpServerIdと認証情報のmcpServerIdが一致するかを検証します。
 */
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authType = detectAuthType(c);

  // JWT認証 (EE機能)
  if (authType === AuthType.OAUTH) {
    const jwtMiddleware = await loadJwtMiddleware();
    if (jwtMiddleware) {
      logInfo("Using JWT authentication");
      return jwtMiddleware(c, next);
    }
    // CE版ではJWT認証が利用不可
    return c.json(
      createUnauthorizedError("JWT authentication is not available", {
        hint: "JWT authentication requires Enterprise Edition. Use API key instead.",
      }),
      401,
    );
  }

  // API Key認証
  if (authType === AuthType.API_KEY) {
    logInfo("Using API Key authentication");
    return apiKeyAuthMiddleware(c, next);
  }

  // 認証情報なし
  return c.json(
    createUnauthorizedError("Authentication required", {
      hint: "Provide JWT token (Bearer eyJ...) or API key (Bearer tumiki_... or Tumiki-API-Key header)",
    }),
    401,
  );
};
