/**
 * MCP実行コンテキスト (CE stub)
 *
 * Community Edition では最小限のコンテキスト管理のみ提供。
 * Enterprise Edition では context.ee.ts の完全な実装が使用される。
 */

import type { TransportType, PiiMaskingMode } from "@tumiki/db/server";

/**
 * 検出されたPII情報の型（CE版では使用されないがインターフェース互換性のため定義）
 */
export type DetectedPii = {
  infoType: string;
  count: number;
};

/**
 * MCP実行コンテキスト
 *
 * リクエスト受信からレスポンス返却までの全ライフサイクルを管理。
 * middlewareとtoolExecutorで共有する情報を格納。
 */
export type McpExecutionContext = {
  // 初回実行時に設定する情報
  requestStartTime: number;
  inputBytes: number;

  // 実行時に計算される追加情報
  toolName?: string;
  transportType?: TransportType;
  method?: string;
  httpStatus?: number;
  errorCode?: number;
  errorMessage?: string;
  errorDetails?: unknown;

  // リクエストボディ（piiMaskingMode が DISABLED 以外の時、PIIマスキング済み）
  requestBody?: unknown;

  // PII検出情報
  piiMaskingMode?: PiiMaskingMode;
  piiInfoTypes?: string[];
  piiDetectedRequest?: DetectedPii[];
  piiDetectedResponse?: DetectedPii[];

  // TOON変換メトリクス
  toonConversionEnabled?: boolean;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * 現在の実行コンテキストを取得 (CE stub)
 *
 * CE版では常にundefinedを返す
 */
export const getExecutionContext = (): McpExecutionContext | undefined => {
  return undefined;
};

/**
 * 現在の実行コンテキストを部分的に更新 (CE stub)
 *
 * CE版では何もしない
 */
export const updateExecutionContext = (
  _updates: Partial<McpExecutionContext>,
): void => {
  // CE版では何もしない
};

/**
 * 新しい実行コンテキストでコールバックを実行 (CE stub)
 *
 * CE版ではコンテキストなしでそのままコールバックを実行
 */
export const runWithExecutionContext = async <T>(
  _context: McpExecutionContext,
  callback: () => Promise<T>,
): Promise<T> => {
  return callback();
};
