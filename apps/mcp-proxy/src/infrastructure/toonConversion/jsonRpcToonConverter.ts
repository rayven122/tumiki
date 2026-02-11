/**
 * JSON-RPC 2.0 対応 TOON変換ロジック
 *
 * JSON-RPC構造を維持しながら、result または error.data のみをTOON変換する。
 * jsonrpc, id, error.code, error.message は元のまま維持される。
 */

import { encode } from "@toon-format/toon";

import {
  isMcpToolCallResult,
  isJsonRpcErrorResponse,
  isJsonRpcSuccessResponse,
  type McpContentItem,
  type McpToolCallResult,
} from "../../shared/utils/jsonRpc/typeGuards.js";
import { countTokens } from "@tumiki/shared/utils/tokenCount";

/**
 * TOON変換結果
 */
type ToonConversionResult = {
  /** 変換後のデータ（JSON文字列） */
  convertedData: string;
  /** 変換が実行されたかどうか */
  wasConverted: boolean;
  /** 変換前のトークン数（元データのトークン数） */
  inputTokens: number;
  /** 変換後のトークン数（AIに渡される最終的なトークン数） */
  outputTokens: number;
};

/**
 * テキストをTOON変換する
 * JSON文字列の場合はパースしてからエンコード、そうでなければ文字列をそのままエンコード
 */
const convertTextToToon = (text: string): string => {
  try {
    // JSON文字列の場合はパースしてからTOON変換
    const parsed: unknown = JSON.parse(text);
    return encode(parsed);
  } catch {
    // JSONでない場合は文字列をそのままTOON変換
    return encode(text);
  }
};

/**
 * MCP result の content[].text を TOON 変換する
 * MCP プロトコルの構造（content 配列）は維持しながら、text フィールドのみを変換
 */
const convertMcpResult = (result: unknown): unknown => {
  // MCP tools/call レスポンスでない場合は全体を TOON 変換
  if (!isMcpToolCallResult(result)) {
    return encode(result);
  }

  // content 配列構造を維持しながら text フィールドのみを TOON 変換
  const convertedContent: McpContentItem[] = result.content.map((item) => {
    if (item.type === "text") {
      return {
        ...item,
        text: convertTextToToon(item.text),
      };
    }
    return item;
  });

  const convertedResult: McpToolCallResult = {
    ...result,
    content: convertedContent,
  };

  return convertedResult;
};

/**
 * 変換なしの結果を返す
 */
const noConversion = (data: string): ToonConversionResult => {
  const tokens = countTokens(data);
  return {
    convertedData: data,
    wasConverted: false,
    inputTokens: tokens,
    outputTokens: tokens,
  };
};

/**
 * 圧縮効率が良い場合のみ変換結果を返し、そうでなければ元データを返す
 */
const pickSmallerOutput = (
  originalData: string,
  convertedData: string,
  inputTokens: number,
): ToonConversionResult => {
  const outputTokens = countTokens(convertedData);

  // 圧縮効率が良くない場合（変換後のトークン数が変換前以上）は変換しない
  if (outputTokens >= inputTokens) {
    return {
      convertedData: originalData,
      wasConverted: false,
      inputTokens,
      outputTokens: inputTokens,
    };
  }

  return {
    convertedData,
    wasConverted: true,
    inputTokens,
    outputTokens,
  };
};

/**
 * MCPレスポンス（JSON-RPC 2.0形式）をTOON形式に変換する
 *
 * 圧縮効率が良くない場合（変換後のトークン数が変換前以上）は変換せずに元データを返す。
 *
 * @param responseText - レスポンスJSON文字列
 * @returns TOON変換結果（メトリクス付き）
 */
export const convertMcpResponseToToon = (
  responseText: string,
): ToonConversionResult => {
  // 空文字列の場合はそのまま返す
  if (!responseText) {
    return noConversion(responseText);
  }

  // 変換前のトークン数を計算
  const inputTokens = countTokens(responseText);

  const parsed: unknown = JSON.parse(responseText);

  // 成功レスポンスの場合
  if (isJsonRpcSuccessResponse(parsed)) {
    // MCP tools/call のレスポンス構造を維持しながら content[].text のみ変換
    const convertedResult = convertMcpResult(parsed.result);
    const converted = JSON.stringify({
      jsonrpc: "2.0",
      id: parsed.id,
      result: convertedResult,
    });
    return pickSmallerOutput(responseText, converted, inputTokens);
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
    return pickSmallerOutput(responseText, converted, inputTokens);
  }

  // JSON-RPC形式でない場合、またはエラーレスポンス（dataなし）の場合は全体をTOON変換
  const converted = encode(parsed);
  return pickSmallerOutput(responseText, converted, inputTokens);
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
    return noConversion(responseText);
  }
};
