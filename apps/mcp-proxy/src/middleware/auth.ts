import type { Context, Next } from "hono";
import { db } from "@tumiki/db/server";
import type { AuthInfo } from "../types/index.js";
import type { HonoEnv } from "../types/hono.js";
import { logError } from "../utils/logger.js";

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
    const mcpApiKey = await db.mcpApiKey.findUnique({
      where: { apiKey },
    });

    if (!mcpApiKey || !mcpApiKey.isActive) {
      return undefined;
    }

    // UserMcpServerInstanceを取得して組織IDを取得
    const instance = await db.userMcpServerInstance.findUnique({
      where: { id: mcpApiKey.userMcpServerInstanceId },
      select: {
        organizationId: true,
      },
    });

    if (!instance) {
      return undefined;
    }

    // 最終使用日時を非同期で更新（レスポンスをブロックしない）
    db.mcpApiKey
      .update({
        where: { id: mcpApiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error: unknown) => {
        logError("Failed to update lastUsedAt", error as Error);
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
 */
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
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
