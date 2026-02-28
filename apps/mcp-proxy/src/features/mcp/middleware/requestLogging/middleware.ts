/**
 * MCP Request Logging Middleware
 *
 * リクエストのタイミング計測と入出力バイト数の記録を行うミドルウェア。
 * AsyncLocalStorageを使用してリクエスト全体でコンテキストを共有する。
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../../../shared/types/honoEnv.js";
import {
  runWithExecutionContext,
  getExecutionContext,
  type McpExecutionContext,
} from "./context.js";
import { db, type Prisma, PiiMaskingMode } from "@tumiki/db/server";
import { logError, logInfo } from "../../../../shared/logger/index.js";
import { publishMcpLog } from "../../../../infrastructure/pubsub/mcpLogger.js";
import { byteLength } from "../../../../shared/utils/byteLength.js";
import { countTokens } from "@tumiki/shared/utils/tokenCount";

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

  // toolNameもmethodも存在しない場合はログを記録しない（MCP以外のリクエスト）
  // tools/list の場合は toolName が空文字列だが method が設定されているのでログ記録する
  if (!executionContext?.toolName && !executionContext?.method) {
    return;
  }

  // リクエストボディ: piiMaskingMiddlewareでマスキング済みならそれを使用
  const requestBody: unknown =
    executionContext.requestBody ?? (await c.req.json());
  // レスポンスボディ: piiMaskingMiddlewareでマスキング済みResponseに置換されているため
  // c.resから取得すればマスキング済みデータが得られる
  // JSONパースを試み、失敗したらテキストとして取得
  const responseText = await c.res.clone().text();
  let responseBody: unknown;
  try {
    responseBody = JSON.parse(responseText);
  } catch {
    // JSONパースに失敗した場合はテキストとして扱う
    responseBody = responseText;
  }

  // UTF-8エンコードでのバイト数を計算（マスキング後のサイズ）
  const inputBytes = byteLength(JSON.stringify(requestBody));
  const outputBytes = byteLength(JSON.stringify(responseBody));

  // 実行時間を計算
  const durationMs = executionContext.requestStartTime
    ? Date.now() - executionContext.requestStartTime
    : 0;

  // PII検出情報を計算
  const piiMaskingMode =
    executionContext.piiMaskingMode ?? PiiMaskingMode.DISABLED;
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

  // TOON変換メトリクスを取得
  const toonConversionEnabled = executionContext.toonConversionEnabled;
  const inputTokens = executionContext.inputTokens;
  // outputTokensが未設定の場合（TOON変換無効時）はレスポンスから計算
  const outputTokens =
    executionContext.outputTokens ?? countTokens(responseText);

  // PostgreSQL用ログデータを構築（詳細フィールドはBigQueryのみに保存）
  const postgresLogData = {
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

    // AIツール呼び出しID（チャットメッセージとの紐付け用）
    toolCallId: executionContext.toolCallId,

    // PII検出情報（集計データのみ、詳細はBigQuery）
    piiMaskingMode,
    piiDetectedRequestCount,
    piiDetectedResponseCount,
    piiDetectedInfoTypes,

    // TOON変換メトリクス
    toonConversionEnabled,
    inputTokens,
    outputTokens,
  };

  // PostgreSQLにログ記録し、IDを取得
  const requestLogId = await logMcpServerRequest(postgresLogData).catch(
    (error) => {
      // エラーをキャッチしてログに記録（リクエストには影響させない）
      logError(
        "Failed to log MCP server request in middleware",
        error as Error,
        {
          toolName: executionContext.toolName,
          mcpServerId: authContext.mcpServerId,
        },
      );
      return null;
    },
  );

  // BigQueryへ非同期送信（Pub/Sub経由）
  // PostgreSQLへの記録成否に関わらず送信し、失敗時はフラグで識別可能にする
  // 注意: PostgreSQLには保存しない詳細フィールドもBigQueryには送信する
  await publishMcpLog({
    ...postgresLogData,
    // PostgreSQL記録成功時はそのIDを使用、失敗時は新しいUUIDを生成
    id: requestLogId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    requestBody,
    responseBody,
    // エラー情報（インシデント追跡用）
    errorCode: executionContext.errorCode,
    errorMessage: executionContext.errorMessage,
    errorDetails: executionContext.errorDetails,
    // PII検出詳細（BigQueryのみ、PostgreSQLには保存しない）
    piiDetectionDetailsRequest,
    piiDetectionDetailsResponse,
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
