/**
 * メッセージパーツ構築ヘルパー
 */

/** テキストパーツ型 */
export type TextPart = {
  type: "text";
  text: string;
};

/** ツール呼び出しパーツ型 */
export type ToolCallPart = {
  type: string;
  toolCallId: string;
  state: "output-available";
  input: unknown;
  output: unknown;
};

/** メッセージパーツの型 */
export type MessagePart = TextPart | ToolCallPart;

/** AI SDK streamText の結果型（必要なプロパティのみ） */
export type StreamTextResult = {
  text: string;
  steps?: Array<{
    toolCalls?: Array<{
      toolCallId: string;
      toolName: string;
      input: unknown;
    }>;
    toolResults?: Array<{
      toolCallId: string;
      output: unknown;
    }>;
  }>;
};

/**
 * streamTextの結果からメッセージパーツを生成
 */
export const buildMessageParts = (result: StreamTextResult): MessagePart[] => {
  const parts: MessagePart[] = [];

  // テキスト出力
  if (result.text) {
    parts.push({ type: "text", text: result.text });
  }

  // ツール呼び出し情報をpartsに追加
  for (const step of result.steps ?? []) {
    for (const toolCall of step.toolCalls ?? []) {
      const toolResult = step.toolResults?.find(
        (r) => r.toolCallId === toolCall.toolCallId,
      );
      parts.push({
        type: `tool-${toolCall.toolName}`,
        toolCallId: toolCall.toolCallId,
        state: "output-available",
        input: toolCall.input,
        output: toolResult?.output,
      });
    }
  }

  // パーツが空の場合はデフォルトのテキストを追加
  if (parts.length === 0) {
    parts.push({ type: "text", text: "" });
  }

  return parts;
};
