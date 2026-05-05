/**
 * MCP CallToolResult を TOON (Token-Oriented Object Notation) 形式に変換する
 *
 * Desktop の stdio inbound では JSON-RPC エンベロープが SDK 側で処理されるため、
 * ここでは `CallToolResult.content[].text` のみを変換対象とする。
 * 圧縮効率が悪化する場合（出力サイズが入力以上）は元の text を維持する。
 */

import { encode } from "@toon-format/toon";

import type { CallToolResult } from "../types.js";

/**
 * 個別 text を TOON にエンコードする
 * JSON 文字列はパースしてからエンコード、それ以外は文字列そのままエンコード
 */
const encodeText = (text: string): string => {
  try {
    const parsed: unknown = JSON.parse(text);
    return encode(parsed);
  } catch {
    return encode(text);
  }
};

/**
 * CallToolResult.content[].text を TOON 形式に変換する
 *
 * - text タイプの content のみを変換対象とし、image/audio/resource 等はそのまま透過する
 * - text 単位で「TOON 化したほうが短くなる場合のみ」変換を採用する（pickSmallerOutput 相当）
 * - 失敗時はフェイルオープン（変換せず元の result を返す）
 */
export const applyToonConversion = (result: CallToolResult): CallToolResult => {
  try {
    const convertedContent = result.content.map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("type" in item) ||
        (item as { type: unknown }).type !== "text" ||
        !("text" in item) ||
        typeof (item as { text: unknown }).text !== "string"
      ) {
        return item;
      }

      const textItem = item as { type: "text"; text: string } & Record<
        string,
        unknown
      >;
      const original = textItem.text;
      const encoded = encodeText(original);

      // 圧縮効率が悪い（同じか膨張する）場合は元の text を維持する
      if (encoded.length >= original.length) {
        return item;
      }

      return { ...textItem, text: encoded };
    });

    return {
      ...result,
      content: convertedContent,
    };
  } catch {
    // 変換例外時は元の結果をそのまま返す（フェイルオープン）
    return result;
  }
};
