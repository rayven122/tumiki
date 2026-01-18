/**
 * JWT検証ユーティリティ
 *
 * Bearer トークンの抽出、JWT検証、ユーザーID解決など
 * 認証ミドルウェア間で共通利用される関数を提供
 */

import type { Context } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../logger/index.js";
import { verifyKeycloakJWT } from "./jwt-verifier.js";
import { getUserIdFromKeycloakId } from "../../services/mcpServerService.js";

/**
 * JWT検証結果の型
 */
export type JwtVerificationResult =
  | {
      success: true;
      payload: Awaited<ReturnType<typeof verifyKeycloakJWT>>;
    }
  | {
      success: false;
      error:
        | "no_bearer_token"
        | "token_expired"
        | "invalid_signature"
        | "invalid_token";
    };

/**
 * ユーザーID解決結果の型
 */
export type UserIdResolutionResult =
  | {
      success: true;
      userId: string;
    }
  | {
      success: false;
      error: "user_not_found" | "resolution_failed";
    };

/**
 * Authorization ヘッダーから Bearer トークンを抽出
 *
 * @param authHeader - Authorization ヘッダーの値
 * @returns Bearer トークン文字列、または抽出できない場合はnull
 */
export const extractBearerToken = (
  authHeader: string | undefined,
): string | null => {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7); // "Bearer " を除去
};

/**
 * JWT トークンを検証
 *
 * @param token - JWTトークン文字列
 * @returns 検証結果（成功時はペイロード、失敗時はエラータイプ）
 */
export const verifyJwtToken = async (
  token: string,
): Promise<JwtVerificationResult> => {
  try {
    const payload = await verifyKeycloakJWT(token);
    return { success: true, payload };
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("expired")) {
      return { success: false, error: "token_expired" };
    }

    if (errorMessage.includes("signature")) {
      return { success: false, error: "invalid_signature" };
    }

    logError("JWT verification failed", error as Error);
    return { success: false, error: "invalid_token" };
  }
};

/**
 * Keycloak ID から Tumiki ユーザー ID を解決
 *
 * @param keycloakId - Keycloak の subject claim (JWT sub)
 * @returns 解決結果（成功時はuserId、失敗時はエラータイプ）
 */
export const resolveUserIdFromKeycloak = async (
  keycloakId: string,
): Promise<UserIdResolutionResult> => {
  try {
    const userId = await getUserIdFromKeycloakId(keycloakId);
    if (!userId) {
      return { success: false, error: "user_not_found" };
    }
    return { success: true, userId };
  } catch (error) {
    logError("Failed to resolve user ID from Keycloak ID", error as Error, {
      keycloakId,
    });
    return { success: false, error: "resolution_failed" };
  }
};

/**
 * JWT認証の完全なフロー（トークン抽出 → 検証 → ユーザーID解決）
 *
 * 成功時はJWTペイロードとユーザーIDを返す
 * 失敗時はエラータイプを返す
 */
export type JwtAuthenticationResult =
  | {
      success: true;
      payload: Awaited<ReturnType<typeof verifyKeycloakJWT>>;
      userId: string;
    }
  | {
      success: false;
      error:
        | "no_bearer_token"
        | "token_expired"
        | "invalid_signature"
        | "invalid_token"
        | "user_not_found"
        | "resolution_failed";
    };

/**
 * JWT認証の完全なフローを実行
 */
export const authenticateWithJwt = async (
  c: Context<HonoEnv>,
): Promise<JwtAuthenticationResult> => {
  // Bearer トークンを抽出
  const authorization = c.req.header("Authorization");
  const token = extractBearerToken(authorization);

  if (!token) {
    return { success: false, error: "no_bearer_token" };
  }

  // JWT を検証
  const verifyResult = await verifyJwtToken(token);
  if (!verifyResult.success) {
    return verifyResult;
  }

  // ユーザー ID を解決
  const userResult = await resolveUserIdFromKeycloak(verifyResult.payload.sub);
  if (!userResult.success) {
    return userResult;
  }

  return {
    success: true,
    payload: verifyResult.payload,
    userId: userResult.userId,
  };
};

/** JWT認証エラータイプ */
export type JwtAuthError = Exclude<
  JwtAuthenticationResult,
  { success: true }
>["error"];

/** JWT認証エラーに対応するエラーメッセージのマッピング */
const JWT_ERROR_MESSAGES: Record<JwtAuthError, string> = {
  no_bearer_token: "Bearer token required in Authorization header",
  token_expired: "Token has expired",
  invalid_signature: "Invalid token signature",
  invalid_token: "Invalid access token",
  user_not_found: "User not found for Keycloak ID",
  resolution_failed: "Failed to verify user identity",
};

/**
 * JWT認証エラーに対応するエラーメッセージを取得
 */
export const getJwtErrorMessage = (error: JwtAuthError): string =>
  JWT_ERROR_MESSAGES[error];
