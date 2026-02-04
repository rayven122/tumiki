/**
 * SPDX-License-Identifier: Elastic-2.0
 * This file is part of Tumiki Enterprise Edition.
 */

/**
 * MCP ログ送信
 *
 * Pub/Sub経由でBigQueryにMCPリクエストログを送信する
 */

import type { TransportType, PiiMaskingMode } from "@tumiki/db/server";
import { logError } from "../logger/index.js";
import { getMcpLogsTopic, isBigQueryLoggingEnabled } from "./index.ee.js";

/**
 * MCPログエントリの型定義
 * BigQueryテーブルスキーマと対応
 */
export type McpLogEntry = {
  // 識別情報
  id: string;
  mcpServerId: string;
  organizationId: string;
  userId: string;
  mcpApiKeyId?: string | null;

  // リクエスト情報
  toolName?: string;
  transportType?: TransportType;
  method?: string;
  httpStatus?: number;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;

  // エラー情報
  errorCode?: number;
  errorMessage?: string;
  errorDetails?: unknown; // エラーオブジェクト全体（BigQueryでJSON型として格納）

  // メタデータ
  userAgent?: string;
  timestamp: string;

  // リクエスト・レスポンス（JSONオブジェクト）
  requestBody?: unknown;
  responseBody?: unknown;

  // PostgreSQLログ記録状態
  // true: PostgreSQLへの記録が失敗（idはBigQuery用に生成されたUUID）
  // false/undefined: PostgreSQLへの記録が成功（idはPostgreSQLのログID）
  postgresLogFailed?: boolean;

  // PII検出情報
  piiMaskingMode?: PiiMaskingMode;
  piiDetectedRequestCount?: number;
  piiDetectedResponseCount?: number;
  piiDetectedInfoTypes?: string[];
  piiDetectionDetailsRequest?: Record<string, number>;
  piiDetectionDetailsResponse?: Record<string, number>;

  // TOON変換メトリクス
  toonConversionEnabled?: boolean;
  /** TOON変換前のトークン数（元データのトークン数） */
  inputTokens?: number;
  /** AIに渡される最終的な出力トークン数 */
  outputTokens?: number;
};

/**
 * MCPログをPub/Subに送信
 *
 * BigQuery Subscriptionにより自動的にBigQueryにストリーミングされる。
 *
 * @param log - 送信するログエントリ
 * @returns 送信完了を示すPromise
 */
export const publishMcpLog = async (log: McpLogEntry): Promise<void> => {
  // BigQueryロギングが無効な場合はスキップ
  if (!isBigQueryLoggingEnabled()) {
    return;
  }

  // トピックを取得（環境変数未設定の場合はnull）
  const topic = getMcpLogsTopic();
  if (!topic) {
    return;
  }

  // 注意: 機密情報のマスキングは行わない（組織・ユーザー単位のアクセス制御で保護）
  // 将来的にGCP DLPによるマスキングオプションを追加予定
  try {
    // organizationId, userIdをメッセージ属性として送信（BigQueryでの効率的なフィルタリング用）
    await topic.publishMessage({
      json: log,
      attributes: {
        organizationId: log.organizationId,
        userId: log.userId,
      },
    });
  } catch (err) {
    logError("Failed to publish MCP log to Pub/Sub", err as Error, {
      mcpServerId: log.mcpServerId,
      toolName: log.toolName,
    });
  }
};
