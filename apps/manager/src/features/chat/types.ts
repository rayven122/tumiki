/**
 * チャット/エージェント実行の共通型定義
 */

/**
 * AI SDK 6 のツール状態
 */
export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

/**
 * dynamic-tool の状態をツール状態にマッピング
 */
export const mapDynamicToolState = (state: string): ToolState => {
  switch (state) {
    case "output-available":
      return "output-available";
    case "error":
      return "output-error";
    case "pending":
    default:
      return "input-available";
  }
};

/**
 * メッセージパーツの基本型
 */
export type MessagePart = Record<string, unknown>;

/**
 * 実行メッセージの型
 */
export type ExecutionMessage = {
  id: string;
  role: string;
  parts: MessagePart[];
  createdAt?: Date;
};
