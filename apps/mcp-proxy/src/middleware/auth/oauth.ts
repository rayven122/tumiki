import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
} from "../../libs/error/index.js";
import { keycloakAuth } from "./jwt.js";
import { checkPermission } from "../../services/permissionService.js";

/**
 * OAuth/JWT認証ミドルウェア
 *
 * 以下の検証を早期returnで順次実行します:
 * 1. JWTトークンの検証（Keycloak）
 * 2. JWTペイロードの存在確認
 * 3. mcp_server_idの存在確認
 * 4. リクエストパスのmcpServerIdの確認
 * 5. mcpServerIdの一致確認
 * 6. MCP_SERVER_INSTANCEへのREAD権限確認
 *
 * Cloud Runのステートレス環境向けに設計:
 * - JWT検証とPermissionチェックを毎回実行
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

  const authMcpServerId = jwtPayload.tumiki?.mcp_server_id;

  // mcp_server_idが存在しない場合は401を返す
  if (!authMcpServerId) {
    return c.json(
      createUnauthorizedError(
        "mcp_server_id is required for MCP server access. This JWT is not valid for MCP operations.",
      ),
      401,
    );
  }

  const pathMcpServerId = c.req.param("mcpServerId");

  // mcpServerIdが存在しない場合は403を返す
  if (!pathMcpServerId) {
    return c.json(
      createPermissionDeniedError("mcpServerId is required in path"),
      403,
    );
  }

  // JWT内のmcp_server_idとリクエストパスのmcpServerIdが一致しない場合は403を返す
  if (authMcpServerId !== pathMcpServerId) {
    return c.json(
      createPermissionDeniedError(
        "MCP Server ID mismatch: You are not authorized to access this MCP server",
      ),
      403,
    );
  }

  // MCP_SERVER_INSTANCEへのREAD権限をチェック
  let hasPermission: boolean;
  try {
    hasPermission = await checkPermission(
      jwtPayload.tumiki.tumiki_user_id,
      jwtPayload.tumiki.org_id,
      "MCP_SERVER_INSTANCE",
      "READ",
      jwtPayload.tumiki.mcp_server_id,
    );
  } catch (error) {
    logError("Permission check failed, denying access", error as Error);
    return c.json(createPermissionDeniedError("Permission check failed"), 403);
  }

  // 権限がない場合は403を返す
  if (!hasPermission) {
    return c.json(
      createPermissionDeniedError(
        "Permission denied: READ access to MCP_SERVER_INSTANCE",
      ),
      403,
    );
  }

  // 認証成功: コンテキストに認証方式を設定
  c.set("authMethod", "jwt");

  await next();
};
