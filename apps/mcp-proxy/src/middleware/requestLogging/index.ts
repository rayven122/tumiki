/**
 * MCP Request Logging Middleware
 *
 * リクエストのタイミング計測と入出力バイト数の記録を行うミドルウェア。
 * AsyncLocalStorageを使用してリクエスト全体でコンテキストを共有する。
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import {
  runWithExecutionContext,
  getExecutionContext,
  type McpExecutionContext,
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

  // 実行コンテキストを取得
  const executionContext = getExecutionContext();

  // toolNameが存在しない場合はログを記録しない（MCP以外のリクエスト）
  if (!executionContext?.toolName) {
    return;
  }

  // 実行コンテキストからリクエスト/レスポンスボディを取得
  // piiMaskingMiddlewareで既にマスキング済みのデータがあればそれを使用
  // なければ元のデータを取得
  const requestBody: unknown =
    executionContext.requestBody ?? (await c.req.json());
  const responseBody =
    executionContext.responseBody ?? (await c.res.clone().json());

  // UTF-8エンコードでのバイト数を計算（マスキング後のサイズ）
  const textEncoder = new TextEncoder();
  const inputBytes = textEncoder.encode(JSON.stringify(requestBody)).length;
  const outputBytes = textEncoder.encode(JSON.stringify(responseBody)).length;

  // 実行時間を計算
  const durationMs = executionContext.requestStartTime
    ? Date.now() - executionContext.requestStartTime
    : 0;

  // PII検出情報を計算
  const piiMaskingEnabled = executionContext.piiMaskingEnabled ?? false;
  const piiDetectedRequest = executionContext.piiDetectedRequest ?? [];
  const piiDetectedResponse = executionContext.piiDetectedResponse ?? [];

  // リクエスト/レスポンスそれぞれの検出件数を合計
  const piiDetectedRequestCount =
    piiDetectedRequest.length > 0
      ? piiDetectedRequest.reduce((sum, pii) => sum + pii.count, 0)
      : undefined;
  const piiDetectedResponseCount =
    piiDetectedResponse.length > 0
      ? piiDetectedResponse.reduce((sum, pii) => sum + pii.count, 0)
      : undefined;

  // InfoType名の配列（重複なし）
  const piiDetectedInfoTypes = [
    ...new Set([
      ...piiDetectedRequest.map((pii) => pii.infoType),
      ...piiDetectedResponse.map((pii) => pii.infoType),
    ]),
  ];

  // InfoType別の詳細（リクエスト/レスポンス別々に保存）
  const piiDetectionDetailsRequest: Record<string, number> | undefined =
    piiDetectedRequest.length > 0
      ? Object.fromEntries(
          piiDetectedRequest.map((pii) => [pii.infoType, pii.count]),
        )
      : undefined;
  const piiDetectionDetailsResponse: Record<string, number> | undefined =
    piiDetectedResponse.length > 0
      ? Object.fromEntries(
          piiDetectedResponse.map((pii) => [pii.infoType, pii.count]),
        )
      : undefined;

  // ログデータを構築
  const logData = {
    // 認証情報
    mcpServerId: authContext.mcpServerId,
    mcpApiKeyId: authContext.mcpApiKeyId ?? null,
    userId: authContext.userId,
    organizationId: authContext.organizationId,

    // リクエスト情報
    toolName: executionContext.toolName,
    transportType: executionContext.transportType ?? "STREAMABLE_HTTPS",
    method: executionContext.method ?? "tools/call", // toolExecutorで設定される
    httpStatus: c.res.status,
    durationMs,
    inputBytes,
    outputBytes,
    userAgent: c.req.header("user-agent"),

    // PII検出情報
    piiMaskingEnabled,
    piiDetectedRequestCount,
    piiDetectedResponseCount,
    piiDetectedInfoTypes,
    piiDetectionDetailsRequest,
    piiDetectionDetailsResponse,
  };

  // PostgreSQLにログ記録し、IDを取得
  const requestLogId = await logMcpServerRequest(logData).catch((error) => {
    // エラーをキャッチしてログに記録（リクエストには影響させない）
    logError("Failed to log MCP server request in middleware", error as Error, {
      toolName: executionContext.toolName,
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
    requestBody,
    responseBody,
    // エラー情報（インシデント追跡用）
    errorCode: executionContext.errorCode,
    errorMessage: executionContext.errorMessage,
    errorDetails: executionContext.errorDetails,
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
  } satisfies McpExecutionContext;

  await runWithExecutionContext(initialContext, async () => {
    try {
      // 次のミドルウェア/ハンドラーを実行（authMiddlewareで認証コンテキストが設定される）
      await next();
    } finally {
      // レスポンス完了後のログ記録を非同期で実行（リクエストをブロックしない）
      void recordRequestLogAsync(c);
    }
  });
};
