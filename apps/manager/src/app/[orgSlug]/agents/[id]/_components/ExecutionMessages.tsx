"use client";

import { Bot, User } from "lucide-react";
import { Response } from "@/components/response";
import { sanitizeText } from "@/lib/utils";
import { ExecutionMcpToolCall } from "./ExecutionMcpToolCall";
import { MessageReasoning } from "@/components/message-reasoning";

/** メッセージパーツの型（API応答から推論） */
type MessagePart = Record<string, unknown>;

/** メッセージの型 */
type ExecutionMessage = {
  id: string;
  role: string;
  parts: MessagePart[];
  createdAt?: Date;
};

type ExecutionMessagesProps = {
  messages: ExecutionMessage[] | undefined;
  isLoading: boolean;
  fallbackOutput: string;
};

/** パーツからtype文字列を取得 */
const getPartType = (part: MessagePart): string => {
  return typeof part.type === "string" ? part.type : "";
};

/** パーツからtext文字列を取得 */
const getPartText = (part: MessagePart): string => {
  return typeof part.text === "string" ? part.text : "";
};

/** パーツからtoolCallIdを取得 */
const getToolCallId = (part: MessagePart): string | undefined => {
  return typeof part.toolCallId === "string" ? part.toolCallId : undefined;
};

/** ユーザーメッセージコンポーネント */
const UserMessage = ({ text }: { text: string }) => (
  <div className="flex justify-end gap-3">
    <div className="bg-primary text-primary-foreground max-w-2xl rounded-xl px-3 py-2">
      <Response>{sanitizeText(text)}</Response>
    </div>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
      <User className="h-5 w-5 text-gray-600" />
    </div>
  </div>
);

/** アシスタントメッセージコンポーネント */
const AssistantMessage = ({ parts }: { parts: MessagePart[] }) => {
  // 重複ツールコールを除外するためのSet
  const seenToolCallIds = new Set<string>();

  return (
    <div className="flex gap-3">
      <div className="ring-border bg-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {parts.map((part, index) => {
          const key = `part-${index}`;
          const partType = getPartType(part);

          // ツールパーツの重複チェック
          if (partType === "dynamic-tool" || partType.startsWith("tool-")) {
            const toolCallId = getToolCallId(part);
            if (toolCallId) {
              if (seenToolCallIds.has(toolCallId)) {
                return null;
              }
              seenToolCallIds.add(toolCallId);
            }
          }

          // reasoning パーツ
          if (partType === "reasoning") {
            const text = getPartText(part);
            if (text) {
              return (
                <MessageReasoning
                  key={key}
                  isLoading={false}
                  reasoning={text}
                />
              );
            }
          }

          // text パーツ
          if (partType === "text") {
            const text = getPartText(part);
            if (text) {
              return (
                <div key={key} className="flex flex-col gap-4">
                  <Response>{sanitizeText(text)}</Response>
                </div>
              );
            }
          }

          // dynamic-tool パーツ（MCP動的ツール）
          if (partType === "dynamic-tool") {
            const toolName =
              typeof part.toolName === "string" ? part.toolName : "";
            const toolCallId = getToolCallId(part) ?? "";
            const state = typeof part.state === "string" ? part.state : "";

            // 状態をツール状態にマッピング
            const mapState = ():
              | "output-available"
              | "output-error"
              | "input-available" => {
              if (state === "output-available") return "output-available";
              if (state === "error") return "output-error";
              return "input-available";
            };

            return (
              <ExecutionMcpToolCall
                key={toolCallId || key}
                toolName={toolName}
                state={mapState()}
                input={part.input}
                output={part.output}
              />
            );
          }

          // tool-* パーツ（AI SDK 6形式）
          if (partType.startsWith("tool-")) {
            const toolCallId = getToolCallId(part) ?? "";
            const state = typeof part.state === "string" ? part.state : "";
            const toolName = partType.replace("tool-", "");

            // MCPツール判定（"__"を含む）
            const isMcpTool = toolName.includes("__");

            if (isMcpTool) {
              return (
                <ExecutionMcpToolCall
                  key={toolCallId || key}
                  toolName={toolName}
                  state={
                    state as
                      | "input-streaming"
                      | "input-available"
                      | "output-available"
                      | "output-error"
                  }
                  input={part.input}
                  output={part.output}
                />
              );
            }

            // 非MCPツールは結果をJSON表示
            if (state === "output-available" && part.output) {
              return (
                <div
                  key={toolCallId || key}
                  className="min-w-0 overflow-hidden rounded-lg border bg-gray-50 p-3"
                >
                  <div className="text-sm font-medium text-gray-700">
                    {toolName}
                  </div>
                  <pre className="mt-2 overflow-auto text-xs break-words whitespace-pre-wrap text-gray-600">
                    {JSON.stringify(part.output, null, 2)}
                  </pre>
                </div>
              );
            }
          }

          return null;
        })}
      </div>
    </div>
  );
};

/**
 * 実行結果のメッセージ表示コンポーネント
 * チャット画面と同じUIでメッセージを表示
 */
export const ExecutionMessages = ({
  messages,
  isLoading,
  fallbackOutput,
}: ExecutionMessagesProps) => {
  // ローディング中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  // メッセージがある場合
  if (messages && messages.length > 0) {
    return (
      <div className="space-y-6">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              // ユーザーメッセージ: textパーツのみ表示
              message.parts
                .filter((p) => getPartType(p) === "text" && getPartText(p))
                .map((part, i) => (
                  <UserMessage key={`user-${i}`} text={getPartText(part)} />
                ))
            ) : (
              // アシスタントメッセージ: 全パーツを表示
              <AssistantMessage parts={message.parts} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // フォールバック: メッセージがない場合はoutputを直接表示
  if (fallbackOutput) {
    return (
      <div className="flex gap-3">
        <div className="ring-border bg-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <Response>{sanitizeText(fallbackOutput)}</Response>
        </div>
      </div>
    );
  }

  return <p className="text-sm text-gray-500">（出力なし）</p>;
};
