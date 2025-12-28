/**
 * PII マスキングミドルウェア
 *
 * MCPサーバーのリクエスト・レスポンスに含まれるPII（個人情報）を
 * GCP DLP APIを使用してマスキングする。
 *
 * 動作条件:
 * - authContext.piiMaskingEnabled が true
 * - GCP認証情報が設定されている（GOOGLE_APPLICATION_CREDENTIALS）
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { logDebug, logError, logInfo } from "../../libs/logger/index.js";
import {
  getPiiMaskingConfig,
  maskMcpMessage,
  type PiiMaskingConfig,
} from "../../libs/piiMasking/index.js";
import { updateExecutionContext } from "../requestLogging/context.js";

/**
 * PII マスキングミドルウェア
 *
 * リクエストとレスポンスの両方をマスキング:
 * 1. リクエストボディを読み取り、マスキング後にコンテキストに保存
 * 2. ハンドラー実行後、レスポンスボディをマスキングして返却
 */
export const piiMaskingMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authContext = c.get("authContext");

  // 認証コンテキストがない場合はスキップ
  if (!authContext) {
    logDebug("PII masking skipped: no auth context");
    return next();
  }

  // PIIマスキングが無効の場合はスキップ
  if (!authContext.piiMaskingEnabled) {
    logDebug("PII masking skipped: disabled for this MCP server", {
      mcpServerId: authContext.mcpServerId,
    });
    return next();
  }

  // GCP DLP設定を取得
  const config = await getPiiMaskingConfig();

  // DLP設定が無効な場合はスキップ
  if (!config.isAvailable) {
    logDebug("PII masking skipped: GCP DLP not available", {
      mcpServerId: authContext.mcpServerId,
    });
    return next();
  }

  logInfo("PII masking enabled for request", {
    mcpServerId: authContext.mcpServerId,
  });

  // リクエストボディをマスキング
  await maskRequestBody(c, config);

  // ハンドラーを実行
  await next();

  // レスポンスボディをマスキング
  return maskResponseBody(c, config);
};

/**
 * リクエストボディをマスキング
 *
 * JSON-RPC 2.0の規格を維持しながら、params内のデータのみをマスキング。
 * マスキング済みボディはコンテキストに保存し、ハンドラー（toolExecutor）が取得できるようにする。
 */
const maskRequestBody = async (
  c: Context<HonoEnv>,
  config: PiiMaskingConfig,
): Promise<void> => {
  try {
    const requestText = await c.req.text();

    if (!requestText) {
      return;
    }

    // JSON-RPC 2.0対応マスキング（jsonrpc, id, method は維持）
    const result = await maskMcpMessage(requestText, config);

    if (result.detectedCount > 0) {
      logInfo("PII detected and masked in request", {
        detectedCount: result.detectedCount,
        processingTimeMs: result.processingTimeMs,
      });
    }

    // マスキング済みリクエストボディを実行コンテキストに保存
    // mcpHandlerがこのコンテキストからマスキング済みボディを取得して使用
    // PIIが検出されなくても保存（ログ記録時に再マスキング不要にするため）
    updateExecutionContext({ requestBody: result.maskedText });
  } catch (error) {
    logError("Failed to mask request body", error as Error);
    // エラー時は元のリクエストをそのまま使用（フェイルオープン）
  }
};

/**
 * レスポンスボディをマスキング
 *
 * JSON-RPC 2.0の規格を維持しながら、result/error.data内のデータのみをマスキング。
 * マスキング済みボディで新しいResponseを作成して返す。
 */
const maskResponseBody = async (
  c: Context<HonoEnv>,
  config: PiiMaskingConfig,
): Promise<Response> => {
  try {
    const originalResponse = c.res;
    const responseText = await originalResponse.clone().text();

    if (!responseText) {
      return originalResponse;
    }

    // JSON-RPC 2.0対応マスキング（jsonrpc, id, error.code, error.message は維持）
    const result = await maskMcpMessage(responseText, config);

    // マスキング済みレスポンスボディを実行コンテキストに保存
    // PIIが検出されなくても保存（ログ記録時に再マスキング不要にするため）
    updateExecutionContext({ responseBody: result.maskedText });

    if (result.detectedCount > 0) {
      logInfo("PII detected and masked in response", {
        detectedCount: result.detectedCount,
        processingTimeMs: result.processingTimeMs,
      });

      // マスキング済みレスポンスで新しいResponseを作成
      return new Response(result.maskedText, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers,
      });
    }

    return originalResponse;
  } catch (error) {
    logError("Failed to mask response body", error as Error);
    // エラー時は元のレスポンスをそのまま返す（フェイルオープン）
    return c.res;
  }
};
