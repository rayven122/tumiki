/**
 * MCP CallToolResult を TOON (Token-Oriented Object Notation) 形式に変換する
 *
 * Desktop の stdio inbound では JSON-RPC エンベロープが SDK 側で処理されるため、
 * ここでは `CallToolResult.content[].text` のみを変換対象とする。
 * 圧縮効率が悪化する場合（出力サイズが入力以上）は元の text を維持する。
 */

import { encode } from "@toon-format/toon";

import type { CallToolResult } from "../types.js";

// JSON パース失敗のみをここで握りつぶす。`encode()` 自体の例外は呼び出し側（applyToonConversion）の
// try-catch でフェイルオープンとして扱うため、ここではキャッチしない
const encodeText = (text: string): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // JSON 以外のプレーンテキストはそのまま文字列としてエンコード
    return encode(text);
  }
  return encode(parsed);
};

// CallToolResult.content[] が text タイプかどうかを判定する型ガード
// content は MCP SDK 都合で unknown[] 型のため、ここで text タイプに絞り込む
// `& Record<string, unknown>` は text 以外の追加プロパティ（_meta 等）をスプレッドで保持するための交差型
// → 型安全性は緩むが、MCP の content オブジェクトに任意拡張プロパティが混入し得る制約上やむを得ない
type TextContentItem = { type: "text"; text: string } & Record<string, unknown>;

const isTextContent = (item: unknown): item is TextContentItem =>
  typeof item === "object" &&
  item !== null &&
  "type" in item &&
  (item as { type: unknown }).type === "text" &&
  "text" in item &&
  typeof (item as { text: unknown }).text === "string";

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
      if (!isTextContent(item)) {
        return item;
      }

      const original = item.text;
      const encoded = encodeText(original);

      // 圧縮効率が悪い（同じか膨張する）場合は元の text を維持する
      if (encoded.length >= original.length) {
        return item;
      }

      return { ...item, text: encoded };
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
