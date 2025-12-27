import type { Context, Next } from "hono";
import { AuthType } from "@tumiki/db";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
  createNotFoundError,
} from "../../libs/error/index.js";
import { verifyKeycloakJWT } from "../../libs/auth/jwt-verifier.js";
import {
  getMcpServerOrganization,
  checkOrganizationMembership,
  getUserIdFromKeycloakId,
} from "../../services/mcpServerService.js";

/**
 * JWT 認証ミドルウェア
 *
 * 以下の検証を早期returnで順次実行:
 * 1. Authorization ヘッダーから Bearer トークンを抽出
 * 2. JWT トークンの検証（Keycloak JWKS 使用）
 * 3. リクエストパスの mcpServerId の確認
 * 4. McpServer から organizationId を取得
 * 5. ユーザーが組織のメンバーかどうかを確認
 *
 * 認可ロジック:
 * - mcpServerId → organizationId → OrganizationMember → userId
 * - ユーザーが組織のメンバーであれば、その組織の MCP サーバーにアクセス可能
 *
 * Cloud Run のステートレス環境向けに設計:
 * - JWT 検証とメンバーシップチェックを毎回実行
 * - セッション状態は保持しない
 */
export const jwtAuthMiddleware = async (
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

    // エラーメッセージから原因を判定
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

  // Step 3: mcpServerId の確認
  const pathMcpServerId = c.req.param("mcpServerId");

  if (!pathMcpServerId) {
    return c.json(
      createPermissionDeniedError("mcpServerId is required in path"),
      403,
    );
  }

  // Step 4: McpServer から organizationId を取得
  let orgId: string;
  try {
    const mcpServer = await getMcpServerOrganization(pathMcpServerId);

    if (!mcpServer) {
      return c.json(
        createNotFoundError(`MCP Server not found: ${pathMcpServerId}`),
        404,
      );
    }

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

  // Step 6: 組織メンバーシップをチェック
  let isMember: boolean;
  try {
    isMember = await checkOrganizationMembership(orgId, userId);
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
    organizationId: orgId,
    userId: userId,
    mcpServerId: pathMcpServerId,
  });

  await next();
};
