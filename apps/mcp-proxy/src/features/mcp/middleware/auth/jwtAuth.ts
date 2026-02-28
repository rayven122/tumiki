import type { Context, Next } from "hono";
import { AuthType, type PiiMaskingMode } from "@tumiki/db";
import type { HonoEnv } from "../../../../shared/types/honoEnv.js";
import { logError } from "../../../../shared/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
  createNotFoundError,
} from "../../../../shared/errors/index.js";
import { verifyKeycloakJWT } from "../../../../infrastructure/keycloak/jwtVerifierImpl.js";
import {
  getMcpServerBySlugOrId,
  checkOrganizationMembership,
} from "../../../../infrastructure/db/repositories/mcpServerRepository.js";
import {
  getUserIdFromKeycloakId,
  getUserIdByEmail,
} from "../../../../infrastructure/db/repositories/userRepository.js";

/**
 * JWT 認証ミドルウェア
 *
 * 以下の検証を早期returnで順次実行:
 * 1. Authorization ヘッダーから Bearer トークンを抽出
 * 2. JWT トークンの検証（Keycloak JWKS 使用）
 * 3. リクエストパスの slug の確認
 * 4. JWTから organizationId を取得
 * 5. Keycloak ID または email から Tumiki User ID を解決
 * 6. slug と organizationId で McpServer を検索
 * 7. ユーザーが組織のメンバーかどうかを確認
 *
 * 認可ロジック:
 * - JWT の tumiki.org_id から organizationId を取得
 * - slug + organizationId → McpServer
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

  // Step 3: slugまたはIDの確認
  const pathSlugOrId = c.req.param("slug");

  if (!pathSlugOrId) {
    return c.json(createPermissionDeniedError("slug or ID is required in path"), 403);
  }

  // Step 4: JWTから organizationId を取得
  const orgId = jwtPayload.tumiki?.org_id;
  if (!orgId) {
    return c.json(
      createPermissionDeniedError(
        "Organization ID not found in JWT. Please ensure org_id is set in JWT claims.",
      ),
      403,
    );
  }

  // Step 5: Keycloak ID または email から Tumiki User ID を解決
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
      return c.json(
        createUnauthorizedError("User not found for Keycloak ID or email"),
        401,
      );
    }
    userId = resolvedUserId;
  } catch (error) {
    logError("Failed to resolve user ID", error as Error, {
      keycloakId: jwtPayload.sub,
      email: jwtPayload.email,
    });
    return c.json(
      createUnauthorizedError("Failed to verify user identity"),
      401,
    );
  }

  // Step 6: slugまたはID と organizationId で McpServer を検索
  let mcpServerId: string;
  let piiMaskingMode: PiiMaskingMode;
  let piiInfoTypes: string[];
  let toonConversionEnabled: boolean;
  try {
    const mcpServer = await getMcpServerBySlugOrId(pathSlugOrId, orgId);

    if (!mcpServer) {
      return c.json(
        createNotFoundError(`MCP Server not found: ${pathSlugOrId}`),
        404,
      );
    }

    if (mcpServer.deletedAt) {
      return c.json(
        createNotFoundError(`MCP Server has been deleted: ${pathSlugOrId}`),
        404,
      );
    }

    mcpServerId = mcpServer.id;
    piiMaskingMode = mcpServer.piiMaskingMode;
    piiInfoTypes = mcpServer.piiInfoTypes;
    toonConversionEnabled = mcpServer.toonConversionEnabled;
  } catch (error) {
    logError("Failed to get McpServer by slug or ID", error as Error, {
      slugOrId: pathSlugOrId,
      organizationId: orgId,
    });
    return c.json(
      createPermissionDeniedError("Failed to verify MCP server access"),
      403,
    );
  }

  // Step 7: 組織メンバーシップをチェック
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
    userId,
    mcpServerId,
    piiMaskingMode,
    piiInfoTypes,
    toonConversionEnabled,
  });

  await next();
};
