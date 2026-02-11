/**
 * ツールOutput分離ユーティリティ
 *
 * ツール出力をBigQueryに分離し、チャットメッセージには
 * 参照情報（toolCallId）のみを保存するためのユーティリティ関数。
 *
 * すべてのツール出力はBigQueryで管理され、PostgreSQLには
 * outputRefとしてtoolCallIdのみを保存する。
 */

/**
 * ツールパーツの型定義
 */
export type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  /** 出力参照（toolCallId）: BigQueryから取得するためのキー */
  outputRef?: string;
};

/**
 * ツール呼び出しパーツの型ガード
 */
const isToolCallPart = (part: unknown): part is ToolCallPart =>
  typeof part === "object" &&
  part !== null &&
  "type" in part &&
  (part as { type: unknown }).type === "tool-call";

/**
 * ツール出力をBigQuery参照形式に変換
 *
 * outputを削除し、代わりにtoolCallIdへの参照（outputRef）を保存。
 * ツール出力はBigQueryのresponseBodyから取得する。
 *
 * @param part - 元のツールパーツ
 * @returns 変換後のツールパーツ
 */
export const convertToOutputRef = (part: ToolCallPart): ToolCallPart => {
  // tool-call以外、またはoutputがない場合はそのまま返す
  if (part.type !== "tool-call" || part.output === undefined) {
    return part;
  }

  // outputを省略し、参照情報を追加
  return {
    type: part.type,
    toolCallId: part.toolCallId,
    state: part.state,
    input: part.input,
    outputRef: part.toolCallId,
  };
};

/**
 * メッセージのpartsからツール出力をBigQuery参照形式に変換
 *
 * @param parts - メッセージのパーツ配列
 * @returns ツール出力をoutputRefに変換したパーツ配列
 */
export const convertOutputsToRefs = (parts: unknown[]): unknown[] => {
  return parts.map((part) => {
    // 型ガードでtool-callパーツを判定
    if (isToolCallPart(part)) {
      return convertToOutputRef(part);
    }
    return part;
  });
};
