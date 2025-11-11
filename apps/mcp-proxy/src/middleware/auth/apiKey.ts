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
    // 1つのクエリで mcpApiKey と userMcpServerInstance を取得（最適化）
    const mcpApiKey = await db.mcpApiKey.findUnique({
      where: { apiKey },
      include: {
        userMcpServerInstance: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!mcpApiKey?.isActive || !mcpApiKey.userMcpServerInstance) {
      return undefined;
    }

    // includeで取得したインスタンス情報
    const instance = mcpApiKey.userMcpServerInstance;

    return {
      organizationId: instance.organizationId,
      mcpServerInstanceId: mcpApiKey.userMcpServerInstanceId,
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
 *
 * 開発環境モード:
 * - DEV_MODE=true の場合、認証をバイパス
 * - ダミーの認証情報を設定
 */
export const apiKeyAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // 開発環境モード: 認証バイパス
  // development環境のみで有効（staging/test環境では無効）
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_MODE === "true"
  ) {
    // ダミーの認証情報を設定
    c.set("authMethod", "apikey");
    c.set("apiKeyAuthInfo", {
      organizationId: "dev-org-id",
      mcpServerInstanceId: "dev-instance-id",
    });
    await next();
    return;
  }

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
