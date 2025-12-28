/**
 * MCP Request Logging Middleware
 *
 * リクエストのタイミング計測と入出力バイト数の記録を行うミドルウェア。
 * AsyncLocalStorageを使用してリクエスト全体でコンテキストを共有する。
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import {
  runWithRequestLoggingContext,
  getRequestLoggingContext,
  type McpRequestLoggingContext,
} from "./context.js";
import { db, type Prisma } from "@tumiki/db/server";
import { logError, logInfo } from "../../libs/logger/index.js";
import { publishMcpLog } from "../../libs/pubsub/mcpLogger.js";

/**
 * MCP サーバー request log を記録
 * Prisma UncheckedCreateInput を使用してシンプルに実装
 *
 * @returns 作成されたログのID（BigQueryとの紐付けに使用）、エラー時はnull
 */
const logMcpServerRequest = async (
  data: Prisma.McpServerRequestLogUncheckedCreateInput,
): Promise<string | null> => {
  try {
    const requestLog = await db.mcpServerRequestLog.create({ data });

    logInfo("MCP server request logged", {
      requestLogId: requestLog.id,
      mcpServerId: data.mcpServerId,
      toolName: data.toolName,
      durationMs: data.durationMs,
    });

    return requestLog.id;
  } catch (error) {
    logError("Failed to log MCP server request", error as Error, {
      mcpServerId: data.mcpServerId,
      toolName: data.toolName,
    });
    return null;
  }
};

/**
 * レスポンス完了後のログ記録処理（非同期実行）
 */
const recordRequestLogAsync = async (c: Context<HonoEnv>): Promise<void> => {
  // 認証コンテキストから情報を取得
  const authContext = c.get("authContext");
  // authContextが存在しない場合はそのまま返す
  if (!authContext) {
    return;
  }

  // ログコンテキストを取得
  const loggingContext = getRequestLoggingContext();

  // toolNameが存在しない場合はログを記録しない（MCP以外のリクエスト）
  if (!loggingContext?.toolName) {
    return;
  }

  // リクエストボディを再取得（キャッシュから）
  const requestText = await c.req.text();

  // レスポンス情報を取得
  const responseText = await c.res.clone().text();

  // UTF-8エンコードでのバイト数を計算
  const textEncoder = new TextEncoder();
  const inputBytes = textEncoder.encode(requestText).length;
  const outputBytes = textEncoder.encode(responseText).length;

  // 実行時間を計算
  const durationMs = loggingContext.requestStartTime
    ? Date.now() - loggingContext.requestStartTime
    : 0;

  // ログデータを構築
  const logData = {
    // 認証情報
    mcpServerId: authContext.mcpServerId,
    mcpApiKeyId: authContext.mcpApiKeyId ?? null,
    userId: authContext.userId,
    organizationId: authContext.organizationId,

    // リクエスト情報
    toolName: loggingContext.toolName,
    transportType: loggingContext.transportType ?? "STREAMABLE_HTTPS",
    method: loggingContext.method ?? "tools/call", // toolExecutorで設定される
    httpStatus: c.res.status,
    durationMs,
    inputBytes,
    outputBytes,
    userAgent: c.req.header("user-agent"),
  };

  // PostgreSQLにログ記録し、IDを取得
  const requestLogId = await logMcpServerRequest(logData).catch((error) => {
    // エラーをキャッチしてログに記録（リクエストには影響させない）
    logError("Failed to log MCP server request in middleware", error as Error, {
      toolName: loggingContext.toolName,
      mcpServerId: authContext.mcpServerId,
    });
    return null;
  });

  // BigQueryへ非同期送信（Pub/Sub経由）
  // PostgreSQLへの記録成否に関わらず送信し、失敗時はフラグで識別可能にする
  await publishMcpLog({
    ...logData,
    // PostgreSQL記録成功時はそのIDを使用、失敗時は新しいUUIDを生成
    id: requestLogId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    requestBody: requestText,
    responseBody: responseText,
    // エラー情報（インシデント追跡用）
    errorCode: loggingContext.errorCode,
    errorMessage: loggingContext.errorMessage,
    errorDetails: loggingContext.errorDetails,
    // PostgreSQL記録が失敗した場合はフラグを立てる
    postgresLogFailed: requestLogId === null,
  });
};

/**
 * MCP Request Logging Middleware
 *
 * リクエストの開始時刻と入力バイト数を記録し、
 * レスポンス返却後に非同期でログをDBに記録する
 */
export const mcpRequestLoggingMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<void> => {
  // 初期ログコンテキストを設定
  const initialContext = {
    // リクエスト開始時刻を記録
    requestStartTime: Date.now(),
    // inputBytesはrecordRequestLogAsyncで計算
    inputBytes: 0,
  } satisfies McpRequestLoggingContext;

  await runWithRequestLoggingContext(initialContext, async () => {
    try {
      // 次のミドルウェア/ハンドラーを実行（authMiddlewareで認証コンテキストが設定される）
      await next();
    } finally {
      // レスポンス完了後のログ記録を非同期で実行（リクエストをブロックしない）
      void recordRequestLogAsync(c);
    }
  });
};
