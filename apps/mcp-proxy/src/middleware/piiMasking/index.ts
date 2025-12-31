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
 *
 * エラー時はフェイルオープン（元データをそのまま通過）
 */

import type { Context, Next } from "hono";
import { PiiMaskingMode } from "@tumiki/db";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import {
  maskJson,
  maskText,
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
): Promise<void> => {
  const authContext = c.get("authContext");
  const piiMaskingMode = authContext?.piiMaskingMode;

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
    await maskRequestBody(c, {
      infoTypes: authContext?.piiInfoTypes,
    });
  }

  // ハンドラーを実行
  await next();

  // レスポンスマスキング（RESPONSE または BOTH の場合）
  const shouldMaskResponse =
    piiMaskingMode === PiiMaskingMode.RESPONSE ||
    piiMaskingMode === PiiMaskingMode.BOTH;
  if (shouldMaskResponse) {
    c.res = await maskResponseBody(c, {
      infoTypes: authContext?.piiInfoTypes,
    });
  }
};

/**
 * リクエストボディをマスキング
 * マスキング済みボディと検出情報は実行コンテキストに保存
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
    const result = await maskJson(requestData, options);

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
 */
const maskResponseBody = async (
  c: Context<HonoEnv>,
  options?: PiiMaskingOptions,
): Promise<Response> => {
  const originalResponse = c.res;
  const responseText = await originalResponse.clone().text();

  // 空のレスポンスの場合はそのまま返す
  if (!responseText) {
    return originalResponse;
  }

  // テキストを直接マスキング
  // maskText内部でもフェイルオープンしているが、予期せぬエラーに備えてここでも捕捉
  try {
    const result = await maskText(responseText, options);
    updateExecutionContext({
      piiDetectedResponse: result.detectedPiiList,
    });
    return new Response(result.maskedText, {
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
