/**
 * 統合MCPエンドポイント用JWT認証ミドルウェア
 *
 * 統合エンドポイント `/mcp/unified/:unifiedId` 専用の認証ミドルウェア。
 * JWT認証のみをサポートし、作成者のみがアクセス可能。
 */

import type { Context, Next } from "hono";
import { AuthType, PiiMaskingMode, db } from "@tumiki/db/server";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
  createNotFoundError,
} from "../../libs/error/index.js";
import { verifyKeycloakJWT } from "../../libs/auth/jwt-verifier.js";
import {
  checkOrganizationMembership,
  getUserIdFromKeycloakId,
} from "../../services/mcpServerService.js";

/**
 * 統合MCPエンドポイント用JWT認証ミドルウェア
 *
 * 以下の検証を順次実行:
 * 1. Authorization ヘッダーから Bearer トークンを抽出
 * 2. JWT トークンの検証（Keycloak JWKS 使用）
 * 3. URLパスから unifiedId を取得
 * 4. UnifiedMcpServer から createdBy, organizationId を取得
 * 5. JWT userId と createdBy が一致することを確認（作成者のみアクセス可能）
 * 6. ユーザーが組織のメンバーかどうかを確認
 *
 * 認可ロジック:
 * - unifiedId → createdBy → userId
 * - 統合MCPサーバーの作成者のみがアクセス可能
 */
export const unifiedJwtAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // Step 1: Authorization ヘッダーから Bearer トークンを抽出
  const authorization = c.req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return c.json(
      createUnauthorizedError("Bearer token required in Authorization header"),
      401,
    );
  }

  const accessToken = authorization.substring(7); // "Bearer " を除去

  // Step 2: JWT トークンの検証
  let jwtPayload;
  try {
    jwtPayload = await verifyKeycloakJWT(accessToken);
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("expired")) {
      return c.json(createUnauthorizedError("Token has expired"), 401);
    }

    if (errorMessage.includes("signature")) {
      return c.json(createUnauthorizedError("Invalid token signature"), 401);
    }

    logError("JWT verification failed", error as Error);
    return c.json(createUnauthorizedError("Invalid access token"), 401);
  }

  // JWT ペイロードをコンテキストに設定
  c.set("jwtPayload", jwtPayload);

  // Step 3: unifiedId の確認
  const unifiedId = c.req.param("unifiedId");

  if (!unifiedId) {
    return c.json(
      createPermissionDeniedError("unifiedId is required in path"),
      403,
    );
  }

  // Step 4: UnifiedMcpServer を取得
  let unifiedServer;
  try {
    unifiedServer = await db.unifiedMcpServer.findUnique({
      where: { id: unifiedId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        createdBy: true,
        deletedAt: true,
      },
    });

    if (!unifiedServer) {
      return c.json(
        createNotFoundError(`Unified MCP Server not found: ${unifiedId}`),
        404,
      );
    }

    if (unifiedServer.deletedAt) {
      return c.json(
        createNotFoundError(
          `Unified MCP Server has been deleted: ${unifiedId}`,
        ),
        404,
      );
    }
  } catch (error) {
    logError("Failed to get UnifiedMcpServer", error as Error, { unifiedId });
    return c.json(
      createPermissionDeniedError("Failed to verify unified MCP server access"),
      403,
    );
  }

  // Step 5: Keycloak ID から Tumiki User ID を解決
  let userId: string;
  try {
    const resolvedUserId = await getUserIdFromKeycloakId(jwtPayload.sub);
    if (!resolvedUserId) {
      return c.json(
        createUnauthorizedError("User not found for Keycloak ID"),
        401,
      );
    }
    userId = resolvedUserId;
  } catch (error) {
    logError("Failed to resolve user ID from Keycloak ID", error as Error, {
      keycloakId: jwtPayload.sub,
    });
    return c.json(
      createUnauthorizedError("Failed to verify user identity"),
      401,
    );
  }

  // Step 6: 作成者チェック（createdBy == userId）
  if (unifiedServer.createdBy !== userId) {
    return c.json(
      createPermissionDeniedError(
        "Only the creator can access this unified MCP server",
      ),
      403,
    );
  }

  // Step 7: 組織メンバーシップをチェック（追加の安全チェック）
  let isMember: boolean;
  try {
    isMember = await checkOrganizationMembership(
      unifiedServer.organizationId,
      userId,
    );
  } catch (error) {
    logError("Organization membership check failed", error as Error);
    return c.json(createPermissionDeniedError("Membership check failed"), 403);
  }

  if (!isMember) {
    return c.json(
      createPermissionDeniedError("User is not a member of this organization"),
      403,
    );
  }

  // 認証成功: コンテキストに認証情報を設定
  // 統合エンドポイントではPII/TOON設定は子サーバーごとに適用するため
  // ここではデフォルト値（DISABLED）を設定
  c.set("authMethod", AuthType.OAUTH);
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: unifiedServer.organizationId,
    userId: userId,
    mcpServerId: "", // 統合エンドポイントではtools/call時に動的に設定
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
    isUnifiedEndpoint: true,
    unifiedMcpServerId: unifiedId,
  });

  await next();
};
