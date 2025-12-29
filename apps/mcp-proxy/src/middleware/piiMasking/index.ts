/**
 * PII マスキングミドルウェア
 *
 * MCPサーバーのリクエスト・レスポンスに含まれるPII（個人情報）を
 * GCP DLP APIを使用してマスキングする。
 *
 * 動作条件:
 * - authContext.piiMaskingMode が DISABLED 以外
 * - GCP認証情報が設定されている（GOOGLE_APPLICATION_CREDENTIALS）
 *
 * マスキングモード:
 * - DISABLED: マスキング無効
 * - REQUEST: リクエストのみマスキング
 * - RESPONSE: レスポンスのみマスキング
 * - BOTH: 両方マスキング
 */

import type { Context, Next } from "hono";
import { PiiMaskingMode } from "@tumiki/db";
import type { HonoEnv } from "../../types/index.js";
import { logDebug, logError, logInfo } from "../../libs/logger/index.js";
import {
  maskMcpMessage,
  type PiiMaskingOptions,
} from "../../libs/piiMasking/index.js";
import { updateExecutionContext } from "../requestLogging/context.js";

/**
 * PII マスキングミドルウェア
 *
 * piiMaskingMode に応じてリクエスト・レスポンスをマスキング:
 * - DISABLED: スキップ
 * - REQUEST: リクエストのみマスキング
 * - RESPONSE: レスポンスのみマスキング
 * - BOTH: 両方マスキング
 */
export const piiMaskingMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authContext = c.get("authContext");
  const piiMaskingMode = authContext?.piiMaskingMode;

  // PIIマスキングが無効の場合はスキップ
  if (!piiMaskingMode || piiMaskingMode === PiiMaskingMode.DISABLED) {
    logDebug("PII masking skipped: disabled for this MCP server", {
      mcpServerId: authContext?.mcpServerId,
    });
    return next();
  }

  logInfo("PII masking enabled for request", {
    mcpServerId: authContext?.mcpServerId,
    piiMaskingMode,
  });

  // マスキングオプション（使用するInfoType一覧）
  const maskingOptions: PiiMaskingOptions = {
    infoTypes: authContext?.piiInfoTypes,
  };

  // PIIマスキングモードと使用するInfoTypeをコンテキストに記録
  updateExecutionContext({
    piiMaskingMode,
    piiInfoTypes: authContext?.piiInfoTypes,
  });

  // リクエストマスキング（REQUEST または BOTH の場合）
  const shouldMaskRequest =
    piiMaskingMode === PiiMaskingMode.REQUEST ||
    piiMaskingMode === PiiMaskingMode.BOTH;
  if (shouldMaskRequest) {
    await maskRequestBody(c, maskingOptions);
  }

  // ハンドラーを実行
  await next();

  // レスポンスマスキング（RESPONSE または BOTH の場合）
  const shouldMaskResponse =
    piiMaskingMode === PiiMaskingMode.RESPONSE ||
    piiMaskingMode === PiiMaskingMode.BOTH;
  if (shouldMaskResponse) {
    return maskResponseBody(c, maskingOptions);
  }

  return c.res;
};

/**
 * リクエストボディをマスキング
 *
 * JSON-RPC 2.0の規格を維持しながら、params内のデータのみをマスキング。
 * マスキング済みボディはコンテキストに保存し、ハンドラー（toolExecutor）が取得できるようにする。
 *
 * @param c - Honoコンテキスト
 * @param options - マスキングオプション（使用するInfoType一覧）
 */
const maskRequestBody = async (
  c: Context<HonoEnv>,
  options?: PiiMaskingOptions,
): Promise<void> => {
  try {
    const requestData: unknown = await c.req.json();

    if (requestData === null || requestData === undefined) {
      return;
    }

    // JSON-RPC 2.0対応マスキング（jsonrpc, id, method は維持）
    const result = await maskMcpMessage(requestData, options);

    // マスキング済みリクエストボディと検出情報を実行コンテキストに保存
    // mcpHandlerがこのコンテキストからマスキング済みボディを取得して使用
    // PIIが検出されなくても保存（ログ記録時に再マスキング不要にするため）
    updateExecutionContext({
      requestBody: result.maskedData,
      piiDetectedRequest: result.detectedPiiList,
    });
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
 *
 * @param c - Honoコンテキスト
 * @param options - マスキングオプション（使用するInfoType一覧）
 */
const maskResponseBody = async (
  c: Context<HonoEnv>,
  options?: PiiMaskingOptions,
): Promise<Response> => {
  const originalResponse = c.res;

  try {
    const responseData: unknown = await originalResponse.clone().json();

    // JSON-RPC 2.0対応マスキング（jsonrpc, id, error.code, error.message は維持）
    const result = await maskMcpMessage(responseData, options);

    // マスキング済みレスポンスボディと検出情報を実行コンテキストに保存
    // PIIが検出されなくても保存（ログ記録時に再マスキング不要にするため）
    updateExecutionContext({
      responseBody: result.maskedData,
      piiDetectedResponse: result.detectedPiiList,
    });

    // マスキング済みレスポンスで新しいResponseを作成
    return new Response(JSON.stringify(result.maskedData), {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers,
    });
  } catch (error) {
    logError("Failed to mask response body", error as Error);
    // エラー時は元のレスポンスをそのまま返す（フェイルオープン）
    return originalResponse;
  }
};
