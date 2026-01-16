/**
 * 統合MCPサーバーCRUD API用JWT認証ミドルウェア
 *
 * `/unified` CRUD APIエンドポイント専用の認証ミドルウェア。
 * JWT認証のみをサポートし、mcpServerIdを必要としない。
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
 * CRUD API用JWT認証ミドルウェア
 *
 * 以下の検証を順次実行:
 * 1. Authorization ヘッダーから Bearer トークンを抽出
 * 2. JWT トークンの検証（Keycloak JWKS 使用）
 * 3. Keycloak ID から Tumiki User ID を解決
 * 4. JWTクレームから組織IDを取得
 *
 * 認可ロジック:
 * - JWTのsub → userId
 * - JWTのtumiki.org_id → organizationId
 */
export const unifiedCrudJwtAuthMiddleware = async (
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

  // Step 3: Keycloak ID から Tumiki User ID を解決
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

  // Step 4: JWTクレームから組織IDを取得
  const organizationId = jwtPayload.tumiki?.org_id;

  if (!organizationId) {
    return c.json(
      createPermissionDeniedError("Organization ID not found in JWT claims"),
      403,
    );
  }

  // Step 5: 組織メンバーシップをチェック
  let isMember: boolean;
  try {
    isMember = await checkOrganizationMembership(organizationId, userId);
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
  c.set("authMethod", AuthType.OAUTH);
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: organizationId,
    userId: userId,
    mcpServerId: "", // CRUD APIでは不要
    piiMaskingMode: PiiMaskingMode.DISABLED,
    piiInfoTypes: [],
    toonConversionEnabled: false,
    isUnifiedEndpoint: false,
  });

  await next();
};

/**
 * 統合MCPサーバー所有権検証ミドルウェア
 *
 * CRUD API (GET/PUT/DELETE) でIDパラメータがある場合に使用。
 * 認証されたユーザーが統合MCPサーバーの作成者であることを確認。
 */
export const unifiedOwnershipMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authContext = c.get("authContext");
  if (!authContext) {
    return c.json(createUnauthorizedError("Authentication required"), 401);
  }

  const unifiedId = c.req.param("id");
  if (!unifiedId) {
    // IDパラメータがない場合（一覧取得など）はスキップ
    await next();
    return;
  }

  // 統合MCPサーバーを取得
  const unifiedServer = await db.unifiedMcpServer.findUnique({
    where: { id: unifiedId },
    select: {
      id: true,
      createdBy: true,
      organizationId: true,
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
      createNotFoundError(`Unified MCP Server has been deleted: ${unifiedId}`),
      404,
    );
  }

  // 作成者チェック
  if (unifiedServer.createdBy !== authContext.userId) {
    return c.json(
      createPermissionDeniedError(
        "Only the creator can access this unified MCP server",
      ),
      403,
    );
  }

  // 組織IDの一致確認
  if (unifiedServer.organizationId !== authContext.organizationId) {
    return c.json(createPermissionDeniedError("Organization mismatch"), 403);
  }

  await next();
};
