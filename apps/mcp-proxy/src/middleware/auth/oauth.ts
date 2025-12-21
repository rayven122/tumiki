import type { Context, Next } from "hono";
import { AuthType } from "@tumiki/db";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
  createNotFoundError,
} from "../../libs/error/index.js";
import { keycloakAuth } from "./jwt.js";
import {
  getMcpServerOrganization,
  checkOrganizationMembership,
  getUserIdFromKeycloakId,
} from "../../services/mcpServerService.js";

/**
 * OAuth/JWT認証ミドルウェア
 *
 * 以下の検証を早期returnで順次実行します:
 * 1. JWTトークンの検証（Keycloak）
 * 2. JWTペイロードの存在確認
 * 3. リクエストパスのmcpServerIdの確認
 * 4. McpServerからorganizationIdを取得（JWTからは取得しない）
 * 5. ユーザーが組織のメンバーかどうかを確認
 *
 * 認可ロジック:
 * - mcpServerId → organizationId → OrganizationMember → userId
 * - ユーザーが組織のメンバーであれば、その組織のMCPサーバーにアクセス可能
 *
 * Cloud Runのステートレス環境向けに設計:
 * - JWT検証とメンバーシップチェックを毎回実行
 * - セッション状態は保持しない
 */
export const oauthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const result = await keycloakAuth(c, () => Promise.resolve());

  // keycloakAuthが認証エラーのResponseを返した場合は401を返す
  if (result) {
    return result;
  }

  const jwtPayload = c.get("jwtPayload");

  // JWTペイロードが存在しない場合は401を返す
  if (!jwtPayload) {
    return c.json(createUnauthorizedError("Invalid JWT token"), 401);
  }

  const pathMcpServerId = c.req.param("mcpServerId");

  // mcpServerIdが存在しない場合は403を返す
  if (!pathMcpServerId) {
    return c.json(
      createPermissionDeniedError("mcpServerId is required in path"),
      403,
    );
  }

  // McpServerからorganizationIdを取得
  let orgId: string;
  try {
    const mcpServer = await getMcpServerOrganization(pathMcpServerId);

    // McpServerが見つからない場合は404を返す
    if (!mcpServer) {
      return c.json(
        createNotFoundError(`MCP Server not found: ${pathMcpServerId}`),
        404,
      );
    }

    // McpServerが削除されている場合は404を返す
    if (mcpServer.deletedAt) {
      return c.json(
        createNotFoundError(`MCP Server has been deleted: ${pathMcpServerId}`),
        404,
      );
    }

    orgId = mcpServer.organizationId;
  } catch (error) {
    logError("Failed to get McpServer organization", error as Error, {
      mcpServerId: pathMcpServerId,
    });
    return c.json(
      createPermissionDeniedError("Failed to verify MCP server access"),
      403,
    );
  }

  // Keycloak ID から Tumiki User ID を解決
  // Account.providerAccountId = jwtPayload.sub で検索
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

  // 組織メンバーシップをチェック（Tumiki User ID を使用）
  let isMember: boolean;
  try {
    isMember = await checkOrganizationMembership(orgId, userId);
  } catch (error) {
    logError("Organization membership check failed", error as Error);
    return c.json(createPermissionDeniedError("Membership check failed"), 403);
  }

  // 組織のメンバーでない場合は403を返す
  if (!isMember) {
    return c.json(
      createPermissionDeniedError("User is not a member of this organization"),
      403,
    );
  }

  // 認証成功: コンテキストに認証方式を設定
  c.set("authMethod", AuthType.OAUTH);

  // 統一認証コンテキストを設定
  c.set("authContext", {
    authMethod: AuthType.OAUTH,
    organizationId: orgId,
    userId: userId, // Tumiki User ID（Keycloak ID ではなく）
    mcpServerId: pathMcpServerId,
  });

  await next();
};
