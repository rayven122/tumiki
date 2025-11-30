import type { Context, Next } from "hono";
import { db } from "@tumiki/db/server";
import type { ApiKeyAuthInfo, HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import { createUnauthorizedError } from "../../libs/error/index.js";

/**
 * APIキーを抽出
 */
const extractApiKey = (c: Context): string | undefined => {
  // X-API-Key ヘッダー
  const xApiKey = c.req.header("X-API-Key");
  if (xApiKey) {
    return xApiKey;
  }

  // Authorization: Bearer ヘッダー
  const authorization = c.req.header("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return undefined;
};

/**
 * APIキーを検証（データベース）
 *
 * Cloud Runのサーバーレス環境では、毎回DBチェックを行う
 * （キャッシュは外部Redis/Memcachedで実装する場合はPhase 2）
 */
const validateApiKey = async (
  apiKey: string,
): Promise<ApiKeyAuthInfo | undefined> => {
  try {
    // 1つのクエリで mcpApiKey と mcpServer を取得（最適化）
    const mcpApiKey = await db.mcpApiKey.findUnique({
      where: { apiKey },
      include: {
        mcpServer: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!mcpApiKey?.isActive || !mcpApiKey.mcpServer) {
      return undefined;
    }

    // includeで取得したサーバー情報
    const server = mcpApiKey.mcpServer;

    return {
      organizationId: server.organizationId,
      mcpServerInstanceId: mcpApiKey.mcpServerId,
      userId: mcpApiKey.userId, // API Key の作成者
    };
  } catch (error: unknown) {
    logError("Failed to validate API key", error as Error);
    return undefined;
  }
};

/**
 * 認証ミドルウェア
 *
 * Cloud Runのステートレス環境向けに設計
 * - インメモリキャッシュなし（各インスタンスで異なるため）
 * - 毎回DBチェック
 * - 必要に応じてPhase 2でRedis/Memcachedキャッシュを追加
 */
export const apiKeyAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const apiKey = extractApiKey(c);

  if (!apiKey) {
    return c.json(
      createUnauthorizedError("Invalid or inactive API key", {
        hint: "Provide API key via X-API-Key header or Authorization: Bearer header",
      }),
      401,
    );
  }

  // データベース検証
  const apiKeyAuthInfo = await validateApiKey(apiKey);

  if (!apiKeyAuthInfo) {
    return c.json(createUnauthorizedError("Invalid or inactive API key"), 401);
  }

  // 認証情報をコンテキストに設定
  c.set("authMethod", "apikey");
  c.set("apiKeyAuthInfo", apiKeyAuthInfo);

  await next();
};
