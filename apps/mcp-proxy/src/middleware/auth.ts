import type { Context, Next } from "hono";
import { db } from "@tumiki/db/server";
import type { AuthInfo, HonoEnv } from "../types/index.js";
import { logError } from "../libs/logger/index.js";

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
): Promise<AuthInfo | undefined> => {
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

    // 最終使用日時を非同期で更新（レスポンスをブロックしない）
    void db.mcpApiKey
      .update({
        where: { id: mcpApiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error: unknown) => {
        logError("Failed to update lastUsedAt", error as Error, {
          apiKeyId: mcpApiKey.id,
          organizationId: instance.organizationId,
          userMcpServerInstanceId: mcpApiKey.userMcpServerInstanceId,
        });
      });

    return {
      organizationId: instance.organizationId,
      mcpServerInstanceId: mcpApiKey.userMcpServerInstanceId,
      apiKeyId: mcpApiKey.id,
      apiKey: mcpApiKey.apiKey,
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
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // 開発環境モード: 認証バイパス
  // 本番環境では NODE_ENV=production のため、DEV_MODE は無視される
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_MODE === "true"
  ) {
    // ダミーの認証情報を設定
    c.set("authInfo", {
      organizationId: "dev-org-id",
      mcpServerInstanceId: "dev-instance-id",
      apiKeyId: "dev-api-key-id",
      apiKey: "dev-api-key",
    });
    await next();
    return;
  }

  const apiKey = extractApiKey(c);

  if (!apiKey) {
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid or inactive API key",
          data: {
            hint: "Provide API key via X-API-Key header or Authorization: Bearer header",
          },
        },
      },
      401,
    );
  }

  // データベース検証
  const authInfo = await validateApiKey(apiKey);

  if (!authInfo) {
    return c.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid or inactive API key",
        },
      },
      401,
    );
  }

  // 認証情報をコンテキストに設定
  c.set("authInfo", authInfo);

  await next();
};
