/**
 * メッセージパーツ構築ヘルパー
 */

import type { JSONValue } from "ai";

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
  input: JSONValue;
  output: JSONValue | undefined;
};

/** Slack通知結果パーツ型 */
export type SlackNotificationPart = {
  type: "slack-notification";
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  userAction?: string;
};

/** メッセージパーツの型 */
export type MessagePart = TextPart | ToolCallPart | SlackNotificationPart;

/** AI SDK streamText の結果型（必要なプロパティのみ） */
export type StreamTextResult = {
  text: string;
  steps?: Array<{
    toolCalls?: Array<{
      toolCallId: string;
      toolName: string;
      input: JSONValue;
    }>;
    toolResults?: Array<{
      toolCallId: string;
      output: JSONValue;
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

/** Slack通知結果からSlackNotificationPartを生成するためのパラメータ */
export type SlackNotificationResultParams = {
  /** 通知を試みたか */
  attempted: boolean;
  /** 成功したか */
  success: boolean;
  /** エラーコード（失敗時） */
  errorCode?: string;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
  /** ユーザーが取るべきアクション（失敗時） */
  userAction?: string;
};

/**
 * Slack通知結果からSlackNotificationPartを生成
 *
 * @param result - Slack通知結果
 * @returns 通知を試みた場合はSlackNotificationPart、試みなかった場合はnull
 */
export const buildSlackNotificationPart = (
  result: SlackNotificationResultParams,
): SlackNotificationPart | null => {
  // 通知を試みなかった場合はパーツを作成しない
  if (!result.attempted) {
    return null;
  }

  return {
    type: "slack-notification",
    success: result.success,
    ...(result.errorCode && { errorCode: result.errorCode }),
    ...(result.errorMessage && { errorMessage: result.errorMessage }),
    ...(result.userAction && { userAction: result.userAction }),
  };
};
