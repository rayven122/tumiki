/**
 * チャット用JWT認証
 *
 * MCPエンドポイントとは異なり、mcpServerIdではなくorganizationIdで認証する。
 * ルートハンドラー内で呼び出す関数として実装。
 */

import { logError } from "../../shared/logger/index.js";
import { verifyKeycloakJWT } from "../../infrastructure/keycloak/jwtVerifierImpl.js";
import { checkOrganizationMembership } from "../../infrastructure/db/repositories/mcpServerRepository.js";
import {
  getUserIdFromKeycloakId,
  getUserIdByEmail,
} from "../../infrastructure/db/repositories/userRepository.js";
import type { JWTPayload } from "../../shared/types/honoEnv.js";

/**
 * チャット用認証コンテキスト
 */
export type ChatAuthContext = {
  organizationId: string;
  userId: string;
  jwtPayload: JWTPayload;
};

/**
 * 認証エラー
 */
export type ChatAuthError = {
  code: "unauthorized" | "forbidden" | "bad_request";
  message: string;
};

/**
 * 認証結果
 */
export type ChatAuthResult =
  | { success: true; context: ChatAuthContext }
  | { success: false; error: ChatAuthError };

/**
 * チャット用JWT認証を実行
 *
 * 以下の検証を実行:
 * 1. Authorization ヘッダーから Bearer トークンを抽出
 * 2. JWT トークンの検証（Keycloak JWKS 使用）
 * 3. ユーザーが組織のメンバーかどうかを確認
 */
export const verifyChatAuth = async (
  authorization: string | undefined,
  organizationId: string,
): Promise<ChatAuthResult> => {
  // Step 1: Authorization ヘッダーから Bearer トークンを抽出
  if (!authorization?.startsWith("Bearer ")) {
    return {
      success: false,
      error: {
        code: "unauthorized",
        message: "Bearer token required in Authorization header",
      },
    };
  }

  const accessToken = authorization.substring(7);

  // Step 2: JWT トークンの検証
  let jwtPayload: JWTPayload;
  try {
    jwtPayload = await verifyKeycloakJWT(accessToken);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("expired")) {
      return {
        success: false,
        error: { code: "unauthorized", message: "Token has expired" },
      };
    }

    if (errorMessage.includes("signature")) {
      return {
        success: false,
        error: { code: "unauthorized", message: "Invalid token signature" },
      };
    }

    logError("JWT verification failed", error as Error);
    return {
      success: false,
      error: { code: "unauthorized", message: "Invalid access token" },
    };
  }

  // Step 3: Keycloak ID または email から Tumiki User ID を解決
  let userId: string;
  try {
    let resolvedUserId: string | null = null;

    // sub が存在する場合は Keycloak ID で検索
    if (jwtPayload.sub) {
      resolvedUserId = await getUserIdFromKeycloakId(jwtPayload.sub);
    }

    // sub が undefined または見つからない場合は email でフォールバック
    if (!resolvedUserId && jwtPayload.email) {
      resolvedUserId = await getUserIdByEmail(jwtPayload.email);
    }

    if (!resolvedUserId) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "User not found for Keycloak ID or email",
        },
      };
    }
    userId = resolvedUserId;
  } catch (error) {
    logError("Failed to resolve user ID", error as Error, {
      keycloakIdPresent: !!jwtPayload.sub,
      emailPresent: !!jwtPayload.email,
    });
    return {
      success: false,
      error: {
        code: "unauthorized",
        message: "Failed to verify user identity",
      },
    };
  }

  // Step 4: 組織メンバーシップをチェック
  let isMember: boolean;
  try {
    isMember = await checkOrganizationMembership(organizationId, userId);
  } catch (error) {
    logError("Organization membership check failed", error as Error);
    return {
      success: false,
      error: { code: "forbidden", message: "Membership check failed" },
    };
  }

  if (!isMember) {
    return {
      success: false,
      error: {
        code: "forbidden",
        message: "User is not a member of this organization",
      },
    };
  }

  // 認証成功
  return {
    success: true,
    context: {
      organizationId,
      userId,
      jwtPayload,
    },
  };
};
