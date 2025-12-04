import type { Context, Next } from "hono";
import { AuthType } from "@tumiki/db";
import type { HonoEnv } from "../../types/index.js";
import { logInfo } from "../../libs/logger/index.js";
import { AUTH_CONFIG } from "../../constants/config.js";
import { createUnauthorizedError } from "../../libs/error/index.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";
import { oauthMiddleware } from "./oauth.js";

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
 * - `Bearer eyJ...` → OAuth/JWT 認証（Keycloak）
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

  // OAuth/JWT認証
  if (authType === AuthType.OAUTH) {
    logInfo("Using OAuth/JWT authentication");
    return oauthMiddleware(c, next);
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
