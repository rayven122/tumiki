/**
 * チャット/エージェント実行の共通型定義
 *
 * NOTE: このファイルの型定義は mcp-proxy 側の
 * apps/mcp-proxy/src/features/execution/shared/schema.ts
 * と整合性を保つ必要がある
 */

/**
 * AI SDK 6 のツール状態
 *
 * mcp-proxy の ToolState と同一定義
 * @see apps/mcp-proxy/src/features/execution/shared/schema.ts
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
    default:
      // "pending" およびその他の未知の状態
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
