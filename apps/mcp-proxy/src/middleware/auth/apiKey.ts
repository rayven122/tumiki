import type { Context, Next } from "hono";
import { db, AuthType } from "@tumiki/db/server";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import {
  createUnauthorizedError,
  createPermissionDeniedError,
} from "../../libs/error/index.js";
import { AUTH_CONFIG } from "../../constants/config.js";

/**
 * データベースからAPIキーを取得
 *
 * @param apiKey - 検証するAPIキー
 * @returns APIキー情報、または取得に失敗した場合はnull
 */
const fetchApiKeyFromDatabase = async (apiKey: string) => {
  try {
    return await db.mcpApiKey.findUnique({
      where: { apiKey },
      include: {
        mcpServer: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });
  } catch (error) {
    logError("Failed to fetch API key from database", error as Error);
    return null;
  }
};

/**
 * API Key認証ミドルウェア
 */
export const apiKeyAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const tumikiApiKey = c.req.header(AUTH_CONFIG.HEADERS.API_KEY);
  const authorization = c.req.header(AUTH_CONFIG.HEADERS.AUTHORIZATION);
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const apiKey = tumikiApiKey ?? bearerToken;

  // api keyが存在しない場合は401を返す
  if (!apiKey) {
    return c.json(
      createUnauthorizedError("API key is required", {
        hint: "Provide API key via Tumiki-API-Key header or Authorization: Bearer header",
      }),
      401,
    );
  }

  // mcpServerIdが存在しない場合は403を返す
  const pathMcpServerId = c.req.param("mcpServerId");
  if (!pathMcpServerId) {
    return c.json(
      createPermissionDeniedError("mcpServerId is required in path"),
      403,
    );
  }

  const mcpApiKey = await fetchApiKeyFromDatabase(apiKey);

  // api keyが有効でない場合は401を返す
  if (!mcpApiKey?.isActive || !mcpApiKey.mcpServer) {
    return c.json(createUnauthorizedError("Invalid or inactive API key"), 401);
  }

  // api keyの有効期限をチェック
  if (mcpApiKey.expiresAt && mcpApiKey.expiresAt < new Date()) {
    return c.json(createUnauthorizedError("API key has expired"), 401);
  }

  // api keyのmcpServerIdとリクエストパスのmcpServerIdが一致しない場合は403を返す
  if (mcpApiKey.mcpServer.id !== pathMcpServerId) {
    return c.json(
      createPermissionDeniedError(
        "MCP Server ID mismatch: You are not authorized to access this MCP server",
      ),
      403,
    );
  }

  // 認証成功: コンテキストに認証情報を設定
  c.set("authMethod", AuthType.API_KEY);

  // 統一認証コンテキストを設定
  c.set("authContext", {
    authMethod: AuthType.API_KEY,
    organizationId: mcpApiKey.mcpServer.organizationId,
    userId: mcpApiKey.userId,
    mcpServerId: pathMcpServerId,
    mcpApiKeyId: mcpApiKey.id,
  });

  await next();
};
