/**
 * 統合MCPサーバーCRUD API用JWT認証ミドルウェア
 *
 * `/unified` CRUD APIエンドポイント専用の認証ミドルウェア。
 * JWT認証のみをサポートし、mcpServerIdを必要としない。
 */

import type { Context, Next } from "hono";
import { AuthType, PiiMaskingMode, ServerType, db } from "@tumiki/db/server";
import type { HonoEnv } from "../../types/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
  createNotFoundError,
} from "../../libs/error/index.js";
import {
  authenticateWithJwt,
  validateOrganizationMembership,
} from "../../libs/auth/index.js";
import { isAdmin } from "../../services/roleService.js";

/**
 * CRUD API用JWT認証ミドルウェア
 *
 * 以下の検証を順次実行:
 * 1. JWT認証（トークン抽出、検証、ユーザーID解決）
 * 2. JWTクレームから組織IDを取得
 * 3. 組織メンバーシップをチェック
 *
 * 認可ロジック:
 * - JWTのsub → userId
 * - JWTのtumiki.org_id → organizationId
 */
export const unifiedCrudJwtAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // Step 1: JWT認証（トークン抽出、検証、ユーザーID解決）
  const authResult = await authenticateWithJwt(c);

  if (!authResult.success) {
    // エラータイプに応じたレスポンスを返す
    switch (authResult.error) {
      case "no_bearer_token":
        return c.json(
          createUnauthorizedError(
            "Bearer token required in Authorization header",
          ),
          401,
        );
      case "token_expired":
        return c.json(createUnauthorizedError("Token has expired"), 401);
      case "invalid_signature":
        return c.json(createUnauthorizedError("Invalid token signature"), 401);
      case "invalid_token":
        return c.json(createUnauthorizedError("Invalid access token"), 401);
      case "user_not_found":
        return c.json(
          createUnauthorizedError("User not found for Keycloak ID"),
          401,
        );
      case "resolution_failed":
        return c.json(
          createUnauthorizedError("Failed to verify user identity"),
          401,
        );
    }
  }

  const { payload: jwtPayload, userId } = authResult;

  // JWT ペイロードをコンテキストに設定
  c.set("jwtPayload", jwtPayload);

  // Step 2: JWTクレームから組織IDを取得
  const organizationId = jwtPayload.tumiki?.org_id;

  if (!organizationId) {
    return c.json(
      createPermissionDeniedError("Organization ID not found in JWT claims"),
      403,
    );
  }

  // Step 3: 組織メンバーシップをチェック
  const membershipResult = await validateOrganizationMembership(
    organizationId,
    userId,
  );

  if (!membershipResult.isMember) {
    if (membershipResult.error === "check_failed") {
      return c.json(
        createPermissionDeniedError("Membership check failed"),
        403,
      );
    }
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
 *
 * アクセス制御:
 * - GET (詳細取得): 組織メンバー全員がアクセス可能
 * - PUT/DELETE: Owner/Admin のみアクセス可能
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

  // 統合MCPサーバー（serverType=UNIFIED）を取得
  const unifiedServer = await db.mcpServer.findFirst({
    where: {
      id: unifiedId,
      serverType: ServerType.UNIFIED,
    },
    select: {
      id: true,
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

  // 組織IDの一致確認（全操作で必須）
  if (unifiedServer.organizationId !== authContext.organizationId) {
    return c.json(createPermissionDeniedError("Organization mismatch"), 403);
  }

  // HTTPメソッドに応じた権限チェック
  const method = c.req.method;

  if (method === "GET") {
    // GET (詳細取得): 組織メンバーであれば誰でもアクセス可能
    // (組織メンバーシップは unifiedCrudJwtAuthMiddleware で既にチェック済み)
    await next();
    return;
  }

  // PUT/DELETE: Owner/Admin のみアクセス可能
  const jwtPayload = c.get("jwtPayload");
  const roles = jwtPayload?.realm_access?.roles ?? [];
  const hasAdminRole = isAdmin(roles);

  if (!hasAdminRole) {
    return c.json(
      createPermissionDeniedError(
        "Only Owner or Admin can modify unified MCP servers",
      ),
      403,
    );
  }

  await next();
};
