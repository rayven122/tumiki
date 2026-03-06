/**
 * DBメッセージをAI SDK 6形式に変換するユーティリティ
 *
 * features/chat/messageConverter.ts から移動
 * chatとagentExecutorの両方で使用可能
 */

import { convertToolState, type DBToolPart } from "./schema.js";

/**
 * UIMessage形式のメッセージ
 */
export type UIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; [key: string]: unknown }>;
};

/**
 * DBから取得したメッセージを AI SDK 6 UIMessage 形式に変換
 *
 * UIMessage形式では、roleは 'system' | 'user' | 'assistant' のみ。
 * ツール呼び出しとその結果は、アシスタントメッセージの parts 内に
 * 適切な state で含まれる必要がある:
 * - input-streaming: ストリーミング中
 * - input-available: 入力完了
 * - output-available: 結果あり
 * - output-error: エラー
 *
 * 重要: Anthropic API は tool_use ブロックの後にテキストコンテンツを許可しない。
 * tool_use の後にはすぐに tool_result が必要で、continuation text は
 * 新しいアシスタントメッセージとして分離する必要がある。
 */
export const convertDBMessagesToAISDK6Format = (
  messages: Array<{
    id: string;
    role: string;
    parts: unknown[];
  }>,
): UIMessage[] => {
  const result: UIMessage[] = [];

  for (const msg of messages) {
    const role = msg.role as "user" | "assistant" | "system";

    // アシスタントメッセージの場合、ツールパーツの状態を変換し、
    // 必要に応じてメッセージを分割する
    if (role === "assistant") {
      const convertedParts: Array<{ type: string; [key: string]: unknown }> =
        [];

      // 最後の完了済みツールパーツのインデックスを追跡
      let lastCompletedToolIndex = -1;

      // まずすべてのパーツを変換
      for (const part of msg.parts) {
        const typedPart = part as { type: string; [key: string]: unknown };

        // ツール呼び出しパーツの場合、状態を AI SDK 6 形式に変換
        if (typedPart.type.startsWith("tool-")) {
          const toolPart = typedPart as DBToolPart;

          // DB状態を AI SDK 6 状態に変換
          const aiSdk6State = convertToolState(toolPart.state);

          convertedParts.push({
            type: toolPart.type,
            toolCallId: toolPart.toolCallId,
            state: aiSdk6State,
            input: toolPart.input,
            // output-available または output-error の場合のみ output を含む
            ...(aiSdk6State === "output-available" ||
            aiSdk6State === "output-error"
              ? { output: toolPart.output }
              : {}),
          });

          // 完了済みツールパーツの場合、インデックスを更新
          if (
            aiSdk6State === "output-available" ||
            aiSdk6State === "output-error"
          ) {
            lastCompletedToolIndex = convertedParts.length - 1;
          }
        } else {
          // テキストパーツなどはそのまま
          convertedParts.push(typedPart);
        }
      }

      // ツール呼び出しの後にテキストがある場合はメッセージを分割
      // Anthropic API: tool_use ブロックの後にテキストコンテンツは許可されない
      if (
        lastCompletedToolIndex >= 0 &&
        lastCompletedToolIndex < convertedParts.length - 1
      ) {
        // ツールパーツの後にコンテンツがある場合
        const hasTextAfterTool = convertedParts
          .slice(lastCompletedToolIndex + 1)
          .some((p) => p.type === "text" && (p.text as string)?.trim());

        if (hasTextAfterTool) {
          // 最初のメッセージ: ツールパーツまで（ツールパーツを含む）
          const firstParts = convertedParts.slice(
            0,
            lastCompletedToolIndex + 1,
          );
          // 2番目のメッセージ: ツールパーツの後のコンテンツ
          const secondParts = convertedParts.slice(lastCompletedToolIndex + 1);

          // 空でないパーツがある場合のみ追加
          if (firstParts.length > 0) {
            result.push({
              id: msg.id,
              role: "assistant",
              parts: firstParts,
            });
          }

          // 2番目のメッセージ用に新しいIDを生成
          // continuation text を別のアシスタントメッセージとして追加
          if (secondParts.length > 0) {
            result.push({
              id: `${msg.id}_cont`,
              role: "assistant",
              parts: secondParts,
            });
          }

          continue; // この msg の処理は完了
        }
      }

      // 分割不要の場合はそのまま追加
      result.push({
        id: msg.id,
        role: "assistant",
        parts: convertedParts,
      });
    } else {
      // ユーザーメッセージやシステムメッセージはそのまま追加
      result.push({
        id: msg.id,
        role,
        parts: msg.parts as Array<{ type: string; [key: string]: unknown }>,
      });
    }
  }

  return result;
};
