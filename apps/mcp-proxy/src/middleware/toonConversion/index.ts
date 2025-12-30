/**
 * TOON 変換ミドルウェア
 *
 * MCPサーバーからのレスポンスをTOON (Token-Oriented Object Notation) 形式に変換し、
 * AIへのトークン量を削減する。
 *
 * 動作条件:
 * - authContext.toonConversionEnabled が true
 *
 * 動作:
 * - JSON-RPC 2.0構造を維持しながら、result または error.data をTOON形式に変換
 * - jsonrpc, id, error.code, error.message は元のまま維持
 * - エラー時はフェイルオープン（元のJSONをそのまま返す）
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { logError } from "../../libs/logger/index.js";
import { convertMcpResponseToToonSafe } from "../../libs/toonConversion/index.js";
import {
  getExecutionContext,
  updateExecutionContext,
} from "../requestLogging/context.js";

/**
 * TOON 変換ミドルウェア
 *
 * toonConversionEnabled に応じてレスポンスをTOON形式に変換:
 * - false: スキップ
 * - true: レスポンスをTOON形式に変換
 */
export const toonConversionMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<void> => {
  // ハンドラーを実行
  await next();

  // TOON変換が無効の場合はスキップ
  const authContext = c.get("authContext");
  if (!authContext?.toonConversionEnabled) {
    return;
  }

  // tools/call 以外のメソッドはスキップ
  const executionContext = getExecutionContext();
  if (executionContext?.method !== "tools/call") {
    return;
  }

  // TOON変換が有効であることをコンテキストに記録
  updateExecutionContext({
    toonConversionEnabled: true,
  });

  // レスポンスをTOON形式に変換し、c.resを上書き
  c.res = await convertResponseToToon(c);
};

/**
 * レスポンスボディをTOON形式に変換
 *
 * JSON-RPC 2.0の規格を維持しながら、result.content をTOON変換。
 *
 * @param c - Honoコンテキスト
 */
const convertResponseToToon = async (
  c: Context<HonoEnv>,
): Promise<Response> => {
  const originalResponse = c.res;

  try {
    // レスポンスをテキストとして取得
    const responseJson = await originalResponse.clone().text();

    // TOON変換（フェイルセーフ版）
    const result = convertMcpResponseToToonSafe(responseJson);

    // トークン数を実行コンテキストに保存
    updateExecutionContext({
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    // TOON変換済みレスポンスを返す
    return new Response(result.convertedData, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers: originalResponse.headers,
    });
  } catch (error) {
    logError("[TOON] Failed to convert response to TOON", error as Error);
    // エラー時は元のレスポンスをそのまま返す（フェイルオープン）
    return originalResponse;
  }
};
