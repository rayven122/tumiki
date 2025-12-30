/**
 * JSON-RPC 2.0 対応 TOON変換ロジック
 *
 * JSON-RPC構造を維持しながら、result または error.data のみをTOON変換する。
 * jsonrpc, id, error.code, error.message は元のまま維持される。
 */

import { encode } from "@toon-format/toon";
import { parse } from "jsonrpc-lite";

/**
 * TOON変換結果
 */
type ToonConversionResult = {
  /** 変換後のデータ（JSON文字列） */
  convertedData: string;
  /** 変換が実行されたかどうか */
  wasConverted: boolean;
  /** 変換前のバイト数 */
  originalBytes: number;
  /** 変換後のバイト数 */
  convertedBytes: number;
};

const textEncoder = new TextEncoder();

/**
 * バイト数を計算する
 */
const calculateBytes = (text: string): number => {
  return textEncoder.encode(text).length;
};

/**
 * 変換なしの結果を返す
 */
const createNoConversionResult = (
  originalData: string,
  originalBytes: number,
): ToonConversionResult => ({
  convertedData: originalData,
  wasConverted: false,
  originalBytes,
  convertedBytes: originalBytes,
});

/**
 * MCPレスポンス（JSON-RPC 2.0形式）をTOON形式に変換する
 *
 * @param responseJson - レスポンスJSON文字列
 * @returns TOON変換結果（メトリクス付き）
 *
 * @example
 * // 成功レスポンスの場合
 * const result = convertMcpResponseToToon(JSON.stringify({
 *   jsonrpc: "2.0",
 *   id: 1,
 *   result: { users: [{ id: 1, name: "Alice" }] }
 * }));
 * // result.convertedData.result はTOON文字列に変換される
 */
export const convertMcpResponseToToon = (
  responseJson: string,
): ToonConversionResult => {
  const originalBytes = calculateBytes(responseJson);

  // 空文字列の場合はそのまま返す
  if (responseJson === "" || responseJson === "null") {
    return createNoConversionResult(responseJson, originalBytes);
  }

  // jsonrpc-liteでパース
  const parsedResult = parse(responseJson);

  // 配列の場合はサポートしない（単一レスポンスのみ対応）
  if (Array.isArray(parsedResult)) {
    return createNoConversionResult(responseJson, originalBytes);
  }

  const parsed = parsedResult;

  // 成功レスポンスの場合
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- const enumは実行時に文字列として存在
  if (parsed.type === "success") {
    const successPayload = parsed.payload;
    const result: unknown = successPayload.result;
    const toonResult = encode(result);

    const converted = {
      jsonrpc: "2.0" as const,
      id: successPayload.id,
      result: toonResult,
    };

    const convertedJson = JSON.stringify(converted);
    const convertedBytes = calculateBytes(convertedJson);

    return {
      convertedData: convertedJson,
      wasConverted: true,
      originalBytes,
      convertedBytes,
    };
  }

  // エラーレスポンスの場合
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- const enumは実行時に文字列として存在
  if (parsed.type === "error") {
    const errorPayload = parsed.payload;
    const error = errorPayload.error;

    // error.dataが存在する場合のみTOON変換
    if (error.data !== undefined) {
      const errorData: unknown = error.data;
      const toonData = encode(errorData);

      const converted = {
        jsonrpc: "2.0" as const,
        id: errorPayload.id,
        error: {
          code: error.code,
          message: error.message,
          data: toonData,
        },
      };

      const convertedJson = JSON.stringify(converted);
      const convertedBytes = calculateBytes(convertedJson);

      return {
        convertedData: convertedJson,
        wasConverted: true,
        originalBytes,
        convertedBytes,
      };
    }

    // error.dataがない場合は変換しない
    return createNoConversionResult(responseJson, originalBytes);
  }

  // JSON-RPC形式でない場合は全体をTOON変換
  const parsedData: unknown = JSON.parse(responseJson);
  const toonData = encode(parsedData);
  const convertedBytes = calculateBytes(toonData);

  return {
    convertedData: toonData,
    wasConverted: true,
    originalBytes,
    convertedBytes,
  };
};

/**
 * TOON変換を安全に実行する（エラー時はフォールバック）
 *
 * @param responseJson - レスポンスJSON文字列
 * @returns TOON変換結果（エラー時は元データを返す）
 */
export const convertMcpResponseToToonSafe = (
  responseJson: string,
): ToonConversionResult => {
  try {
    return convertMcpResponseToToon(responseJson);
  } catch {
    // エラー時は元のデータをそのまま返す（フェイルオープン）
    const originalBytes = calculateBytes(responseJson);

    return createNoConversionResult(responseJson, originalBytes);
  }
};
