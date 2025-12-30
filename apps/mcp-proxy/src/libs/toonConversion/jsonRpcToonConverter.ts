/**
 * JSON-RPC 2.0 対応 TOON変換ロジック
 *
 * JSON-RPC構造を維持しながら、result または error.data のみをTOON変換する。
 * jsonrpc, id, error.code, error.message は元のまま維持される。
 */

import { encode } from "@toon-format/toon";

import {
  isJsonRpcErrorResponse,
  isJsonRpcSuccessResponse,
} from "../../utils/jsonRpc/typeGuards.js";
import { byteLength } from "../../utils/index.js";

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

/**
 * 変換なしの結果を返す
 */
const noConversion = (data: string, bytes: number): ToonConversionResult => ({
  convertedData: data,
  wasConverted: false,
  originalBytes: bytes,
  convertedBytes: bytes,
});

/**
 * MCPレスポンス（JSON-RPC 2.0形式）をTOON形式に変換する
 *
 * @param responseText - レスポンスJSON文字列
 * @returns TOON変換結果（メトリクス付き）
 */
export const convertMcpResponseToToon = (
  responseText: string,
): ToonConversionResult => {
  const originalBytes = byteLength(responseText);

  // 空文字列の場合はそのまま返す
  if (!responseText) {
    return noConversion(responseText, originalBytes);
  }

  const parsed: unknown = JSON.parse(responseText);

  // 成功レスポンスの場合
  if (isJsonRpcSuccessResponse(parsed)) {
    const converted = JSON.stringify({
      jsonrpc: "2.0",
      id: parsed.id,
      result: encode(parsed.result),
    });
    return {
      convertedData: converted,
      wasConverted: true,
      originalBytes,
      convertedBytes: byteLength(converted),
    };
  }

  // エラーレスポンスの場合（data がある場合のみ変換）
  if (isJsonRpcErrorResponse(parsed) && parsed.error.data !== undefined) {
    const converted = JSON.stringify({
      jsonrpc: "2.0",
      id: parsed.id,
      error: {
        code: parsed.error.code,
        message: parsed.error.message,
        data: encode(parsed.error.data),
      },
    });
    return {
      convertedData: converted,
      wasConverted: true,
      originalBytes,
      convertedBytes: byteLength(converted),
    };
  }

  // JSON-RPC形式でない場合、またはエラーレスポンス（dataなし）の場合は全体をTOON変換
  const converted = encode(parsed);
  return {
    convertedData: converted,
    wasConverted: true,
    originalBytes,
    convertedBytes: byteLength(converted),
  };
};

/**
 * TOON変換を安全に実行する（エラー時はフォールバック）
 *
 * @param responseText - レスポンスJSON文字列
 * @returns TOON変換結果（エラー時は元データを返す）
 */
export const convertMcpResponseToToonSafe = (
  responseText: string,
): ToonConversionResult => {
  try {
    return convertMcpResponseToToon(responseText);
  } catch {
    // エラー時は元のデータをそのまま返す（フェイルオープン）
    const originalBytes = byteLength(responseText);
    return noConversion(responseText, originalBytes);
  }
};
