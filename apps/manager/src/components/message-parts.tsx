"use client";

/**
 * メッセージパーツ共通コンポーネント
 * チャット画面とアバターモードの両方で使用可能
 */

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { McpToolCall } from "./mcp-tool-call";
import { Weather, type WeatherAtLocation } from "./weather";
import { MessageReasoning } from "./message-reasoning";
import { Response } from "./response";
import { SlackNotificationAlert } from "@/app/[orgSlug]/agents/[agentSlug]/_components/SlackNotificationAlert";
import { sanitizeText } from "@/lib/utils";
import {
  type ToolState,
  type SlackNotificationPart,
  mapDynamicToolState,
} from "@/features/chat";

type MessagePartsProps = {
  message: UIMessage;
  isLoading?: boolean;
  /** コンパクト表示（アバターモード用） */
  compact?: boolean;
  /** 読み取り専用 */
  isReadonly?: boolean;
};

/**
 * ツールパーツをレンダリング
 */
const ToolPartRenderer = ({
  part,
  compact,
}: {
  part: { type: string; [key: string]: unknown };
  compact?: boolean;
}) => {
  const { type } = part;

  // dynamic-tool タイプ（MCP動的ツール）の処理
  if (type === "dynamic-tool") {
    const dynamicToolPart = part as {
      type: "dynamic-tool";
      toolName: string;
      toolCallId: string;
      state: string;
      input?: unknown;
      output?: unknown;
      outputRef?: string;
    };

    return (
      <McpToolCall
        toolName={dynamicToolPart.toolName}
        toolCallId={dynamicToolPart.toolCallId}
        state={mapDynamicToolState(dynamicToolPart.state)}
        input={dynamicToolPart.input}
        output={dynamicToolPart.output}
        outputRef={dynamicToolPart.outputRef}
        compact={compact}
      />
    );
  }

  // tool-getWeather の特別処理
  if (type === "tool-getWeather") {
    const toolPart = part as {
      type: "tool-getWeather";
      toolCallId: string;
      state: string;
      input?: unknown;
      output?: WeatherAtLocation;
    };
    const { toolCallId, state } = toolPart;

    if (state === "output-available") {
      return (
        <div
          key={toolCallId}
          className={compact ? "w-full" : "w-[min(100%,450px)]"}
        >
          <Weather weatherAtLocation={toolPart.output} />
        </div>
      );
    }

    return (
      <div
        key={toolCallId}
        className={cn("skeleton", compact ? "w-full" : "w-[min(100%,450px)]")}
      >
        <Weather />
      </div>
    );
  }

  // tool-* 形式のツールパーツ
  if (type.startsWith("tool-")) {
    const toolPart = part as {
      type: `tool-${string}`;
      toolCallId: string;
      state: string;
      input?: unknown;
      output?: unknown;
      outputRef?: string;
    };
    const toolName = type.replace("tool-", "");

    // MCPツールかどうか判定（"__" を含む）
    const isMcpTool = toolName.includes("__");

    if (isMcpTool) {
      return (
        <McpToolCall
          toolName={toolName}
          toolCallId={toolPart.toolCallId}
          state={toolPart.state as ToolState}
          input={toolPart.input}
          output={toolPart.output}
          outputRef={toolPart.outputRef}
          compact={compact}
        />
      );
    }

    // その他のツール（組み込みツール）
    const isToolLoading =
      toolPart.state === "input-streaming" ||
      toolPart.state === "input-available";

    // エラー状態
    if (toolPart.state === "output-error") {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
          エラー: {String(toolPart.output)}
        </div>
      );
    }

    // 結果が利用可能な状態
    if (toolPart.state === "output-available") {
      return (
        <div
          className={cn(
            "my-2 rounded-lg border p-3 text-sm",
            compact
              ? "border-gray-200 bg-gray-50"
              : "border-border bg-muted/30",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="font-medium">{toolName}</span>
          </div>
        </div>
      );
    }

    // ローディング状態
    return (
      <div
        className={cn(
          "my-2 rounded-lg border p-3 text-sm",
          compact ? "border-gray-200 bg-gray-50" : "border-border bg-muted/30",
          isToolLoading && "animate-pulse",
        )}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          <span className="font-medium">{toolName}</span>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * メッセージパーツを共通でレンダリングするコンポーネント
 */
export const MessageParts = ({
  message,
  isLoading = false,
  compact = false,
  isReadonly = true,
}: MessagePartsProps) => {
  return (
    <>
      {message.parts?.map((part, index) => {
        const { type } = part;
        const key = `message-${message.id}-part-${index}`;

        // 推論パート
        if (type === "reasoning") {
          const reasoningPart = part as { type: "reasoning"; text: string };
          if (compact) {
            // コンパクト表示：折りたたみ
            return (
              <details key={key} className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">
                  思考中...
                </summary>
                <div className="mt-1 rounded bg-gray-100 p-2 text-xs">
                  <p className="whitespace-pre-wrap">{reasoningPart.text}</p>
                </div>
              </details>
            );
          }
          return (
            <MessageReasoning
              key={key}
              isLoading={isLoading}
              reasoning={reasoningPart.text}
            />
          );
        }

        // テキストパート
        if (type === "text") {
          const textPart = part as { type: "text"; text: string };

          // 最後のテキストパーツかどうかを判定（タイプライターカーソル表示用）
          const textParts = message.parts?.filter((p) => p.type === "text");
          const isLastTextPart =
            textParts && textParts[textParts.length - 1] === part;
          const showCursor =
            isLoading && message.role === "assistant" && isLastTextPart;

          if (compact) {
            // コンパクト表示（アバターモード用）- テキストのみ返す（親でスタイリング）
            return (
              <span key={key}>
                {textPart.text}
                {showCursor && (
                  <span
                    className="ml-0.5 inline-block h-3 w-[2px] animate-[blink_0.5s_step-end_infinite] bg-current align-middle"
                    aria-hidden="true"
                  />
                )}
              </span>
            );
          }

          // 通常表示（チャット画面用）
          return (
            <div key={key} className="flex flex-col gap-4">
              <Response>{sanitizeText(textPart.text)}</Response>
              {showCursor && (
                <span
                  className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-[blink_0.5s_step-end_infinite] bg-current align-middle"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        }

        // ツールパート
        if (type === "dynamic-tool" || type.startsWith("tool-")) {
          return (
            <ToolPartRenderer
              key={key}
              part={part as { type: string; [key: string]: unknown }}
              compact={compact}
            />
          );
        }

        // Slack通知パート（DBから取得したカスタムパーツタイプ）
        // コンパクト表示（アバターモード）では省略
        // NOTE: AISDKのUIMessageパーツ型には含まれないためstring比較
        if ((type as string) === "slack-notification" && !compact) {
          const slackPart = part as unknown as SlackNotificationPart;
          return (
            <SlackNotificationAlert
              key={key}
              success={slackPart.success}
              channelName={slackPart.channelName}
              errorMessage={slackPart.errorMessage}
              userAction={slackPart.userAction}
            />
          );
        }

        return null;
      })}
    </>
  );
};

/**
 * メッセージからテキストのみを抽出
 */
export const extractTextFromMessage = (message: UIMessage): string => {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");
};

/**
 * メッセージにツールパーツが含まれているか確認
 */
export const hasToolParts = (message: UIMessage): boolean => {
  return message.parts.some(
    (part) => part.type === "dynamic-tool" || part.type.startsWith("tool-"),
  );
};
