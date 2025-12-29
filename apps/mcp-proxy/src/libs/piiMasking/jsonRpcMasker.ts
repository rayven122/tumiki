/**
 * MCP メッセージ PIIマスキング
 *
 * JSON-RPC 2.0の規格を維持しながら、PIIが含まれる可能性のある
 * params/result/error.data のみをDLPに送信してコストを削減する。
 *
 * GCP DLPのreplaceWithInfoTypeConfigはJSON構造を維持するため、
 * 抽出した部分をそのままDLPに渡して結果を戻すだけで良い。
 *
 * 参考: https://docs.cloud.google.com/sensitive-data-protection/docs/transformations-reference
 */

import { z } from "zod";

import {
  maskJson,
  type DetectedPii,
  type JsonMaskingResult,
  type PiiMaskingOptions,
} from "./index.js";

/**
 * JSON-RPC 2.0 リクエストスキーマ
 */
const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * JSON-RPC 2.0 エラースキーマ
 */
const jsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

/**
 * JSON-RPC 2.0 レスポンススキーマ
 */
const jsonRpcResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  result: z.unknown().optional(),
  error: jsonRpcErrorSchema.optional(),
});

/**
 * JSON-RPC 2.0 メッセージスキーマ（リクエストまたはレスポンス）
 */
const jsonRpcMessageSchema = z.union([
  jsonRpcRequestSchema,
  jsonRpcResponseSchema,
]);

type JsonRpcRequest = z.infer<typeof jsonRpcRequestSchema>;
type JsonRpcResponse = z.infer<typeof jsonRpcResponseSchema>;

/**
 * JSON-RPCリクエストかどうかを判定
 */
const isJsonRpcRequest = (
  msg: JsonRpcRequest | JsonRpcResponse,
): msg is JsonRpcRequest => {
  return "method" in msg;
};

/**
 * MCPメッセージをマスキング
 *
 * JSON-RPC 2.0メッセージの場合、PIIが含まれる可能性のある
 * params/result/error.data のみをDLPに送信してコストを削減する。
 *
 * @param messageData MCPメッセージデータ（JSON-RPC 2.0形式）
 * @param options マスキングオプション（使用するInfoType一覧）
 * @returns マスキング結果（パース済みJSON）
 */
export const maskMcpMessage = async (
  messageData: unknown,
  options?: PiiMaskingOptions,
): Promise<JsonMaskingResult<unknown>> => {
  const startTime = Date.now();

  // nullやundefinedの場合はそのまま返す
  if (messageData === null || messageData === undefined) {
    return {
      maskedData: messageData,
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: 0,
    };
  }

  // 配列の場合（バッチリクエスト）は全体をマスキング
  if (Array.isArray(messageData)) {
    return maskJson(messageData, options);
  }

  // JSON-RPCメッセージのバリデーション
  const parseResult = jsonRpcMessageSchema.safeParse(messageData);
  if (!parseResult.success) {
    // JSON-RPCメッセージでない場合は全体をマスキング
    return maskJson(messageData, options);
  }

  const message = parseResult.data;

  // params/result/error.data のみをマスキング
  let totalDetected = 0;
  const allDetectedPii: DetectedPii[] = [];

  if (isJsonRpcRequest(message)) {
    // リクエスト: params をマスキング
    if (message.params !== undefined) {
      const result = await maskJson(message.params, options);
      totalDetected += result.detectedCount;
      allDetectedPii.push(...result.detectedPiiList);
      message.params = result.maskedData;
    }
  } else {
    // レスポンス: result または error.data をマスキング
    if (message.result !== undefined) {
      const result = await maskJson(message.result, options);
      totalDetected += result.detectedCount;
      allDetectedPii.push(...result.detectedPiiList);
      message.result = result.maskedData;
    }
    if (message.error?.data !== undefined) {
      const result = await maskJson(message.error.data, options);
      totalDetected += result.detectedCount;
      allDetectedPii.push(...result.detectedPiiList);
      message.error.data = result.maskedData;
    }
  }

  // 同じInfoTypeをマージ（複数回検出された場合はカウントを合算）
  const mergedPiiMap = new Map<string, number>();
  for (const pii of allDetectedPii) {
    const currentCount = mergedPiiMap.get(pii.infoType) ?? 0;
    mergedPiiMap.set(pii.infoType, currentCount + pii.count);
  }
  const detectedPiiList: DetectedPii[] = Array.from(mergedPiiMap.entries()).map(
    ([infoType, count]) => ({ infoType, count }),
  );

  return {
    maskedData: message,
    detectedCount: totalDetected,
    detectedPiiList,
    processingTimeMs: Date.now() - startTime,
  };
};
