"use client";

import type { UIMessage } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import type { ArtifactKind } from "./artifact";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { PencilEditIcon, SparklesIcon } from "./icons";
import { Response } from "./response";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import { Weather, type WeatherAtLocation } from "./weather";
import equal from "fast-deep-equal";
import { cn, sanitizeText } from "@/lib/utils";
import { McpToolCall } from "./mcp-tool-call";
import { Button } from "@tumiki/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tumiki/ui/tooltip";
import { MessageEditor } from "./message-editor";
import { DocumentPreview } from "./document-preview";
import { MessageReasoning } from "./message-reasoning";
import { TypingIndicator } from "./typing-indicator";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { AgentInfo, ChatMessage } from "@/lib/types";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import { SlackNotificationAlert } from "@/app/[orgSlug]/agents/[agentSlug]/_components/SlackNotificationAlert";
import {
  type SlackNotificationPart,
  mapDynamicToolState,
} from "@/features/chat";

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
  agentInfo,
}: {
  chatId: string;
  message: UIMessage;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  agentInfo?: AgentInfo;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  // AI SDK 6: experimental_attachments は削除され、parts内のfileタイプに変更
  const fileAttachments = message.parts
    ?.filter(
      (part): part is { type: "file"; url: string; mediaType: string } =>
        part.type === "file" && "url" in part,
    )
    .map((part) => ({
      url: part.url,
      name: part.url.split("/").pop() ?? "file",
      contentType: part.mediaType,
    }));

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="group/message mx-auto w-full max-w-3xl px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex w-full gap-4 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            },
          )}
        >
          {message.role === "assistant" && (
            <div className="flex size-8 shrink-0 items-center justify-center">
              {agentInfo ? (
                <EntityIcon
                  iconPath={agentInfo.iconPath}
                  type="agent"
                  size="sm"
                  alt={agentInfo.name}
                />
              ) : (
                <div className="ring-border bg-background flex size-8 items-center justify-center rounded-full ring-1">
                  <div className="translate-y-px">
                    <SparklesIcon size={14} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className={cn("flex w-full flex-col gap-4", {
              "min-h-96": message.role === "assistant" && requiresScrollPadding,
            })}
          >
            {fileAttachments && fileAttachments.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {fileAttachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {(() => {
              // ストリーミング中の重複ツールコールを除外するためのSet
              const seenToolCallIds = new Set<string>();

              return message.parts?.map((part, index) => {
                const { type } = part;
                const key = `message-${message.id}-part-${index}`;

                // ツールパーツの場合、既に同じtoolCallIdを処理済みならスキップ
                // （ストリーミング中に同じツールコールが複数追加される問題への対処）
                if (type === "dynamic-tool" || type.startsWith("tool-")) {
                  const toolPart = part as { toolCallId?: string };
                  if (toolPart.toolCallId) {
                    if (seenToolCallIds.has(toolPart.toolCallId)) {
                      return null; // 重複なのでスキップ
                    }
                    seenToolCallIds.add(toolPart.toolCallId);
                  }
                }

                if (type === "reasoning") {
                  // AI SDK 6: reasoning プロパティは text に変更
                  return (
                    <MessageReasoning
                      key={key}
                      isLoading={isLoading}
                      reasoning={part.text}
                    />
                  );
                }

                if (type === "text") {
                  // 最後のテキストパーツかどうかを判定（タイプライターカーソル表示用）
                  const textParts = message.parts?.filter(
                    (p) => p.type === "text",
                  );
                  const isLastTextPart =
                    textParts && textParts[textParts.length - 1] === part;
                  const showCursor =
                    isLoading && message.role === "assistant" && isLastTextPart;

                  if (mode === "view") {
                    return (
                      <div
                        key={key}
                        className="flex flex-row items-start gap-2"
                      >
                        {message.role === "user" && !isReadonly && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                data-testid="message-edit-button"
                                variant="ghost"
                                className="text-muted-foreground h-fit rounded-full px-2 opacity-0 group-hover/message:opacity-100"
                                onClick={() => {
                                  setMode("edit");
                                }}
                              >
                                <PencilEditIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit message</TooltipContent>
                          </Tooltip>
                        )}

                        <div
                          data-testid="message-content"
                          className={cn("flex flex-col gap-4", {
                            "bg-primary text-primary-foreground rounded-xl px-3 py-2":
                              message.role === "user",
                          })}
                        >
                          <Response>{sanitizeText(part.text)}</Response>
                          {showCursor && (
                            <span
                              className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-[blink_0.5s_step-end_infinite] bg-current align-middle"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (mode === "edit") {
                    return (
                      <div
                        key={key}
                        className="flex flex-row items-start gap-2"
                      >
                        <div className="size-8" />

                        <MessageEditor
                          key={message.id}
                          message={message}
                          setMode={setMode}
                          setMessages={setMessages}
                          regenerate={regenerate}
                        />
                      </div>
                    );
                  }
                }

                // AI SDK 6: dynamic-tool タイプ（MCP動的ツール）の処理
                if (type === "dynamic-tool") {
                  const dynamicToolPart = part as unknown as {
                    type: "dynamic-tool";
                    toolName: string;
                    toolCallId: string;
                    state: string; // "pending" | "output-available" | "error" など
                    input?: unknown;
                    output?: unknown;
                    outputRef?: string;
                  };

                  return (
                    <McpToolCall
                      key={dynamicToolPart.toolCallId}
                      toolName={dynamicToolPart.toolName}
                      toolCallId={dynamicToolPart.toolCallId}
                      state={mapDynamicToolState(dynamicToolPart.state)}
                      input={dynamicToolPart.input}
                      output={dynamicToolPart.output}
                      outputRef={dynamicToolPart.outputRef}
                    />
                  );
                }

                // AI SDK 6: tool-${toolName} 形式のツールパーツを処理
                // 状態: input-streaming, input-available, output-available, output-error
                if (type === "tool-getWeather") {
                  const toolPart = part as unknown as {
                    type: "tool-getWeather";
                    toolCallId: string;
                    state: string;
                    input?: unknown;
                    output?: WeatherAtLocation;
                  };
                  const { toolCallId, state } = toolPart;

                  // 結果が利用可能な場合
                  if (state === "output-available") {
                    return (
                      <div key={toolCallId} className="w-[min(100%,450px)]">
                        <Weather weatherAtLocation={toolPart.output} />
                      </div>
                    );
                  }

                  // 入力中または実行中の場合はスケルトン表示
                  return (
                    <div
                      key={toolCallId}
                      className="skeleton w-[min(100%,450px)]"
                    >
                      <Weather />
                    </div>
                  );
                }

                // その他のツールパーツの処理
                if (type.startsWith("tool-")) {
                  // AI SDK 6のツールパーツ構造
                  // 型アサーションには unknown を経由する必要がある
                  const toolPart = part as unknown as {
                    type: `tool-${string}`;
                    toolCallId: string;
                    state: string;
                    input?: unknown;
                    output?: unknown;
                    outputRef?: string;
                  };
                  const { toolCallId, state } = toolPart;
                  // ツール名を抽出 (tool-getWeather → getWeather)
                  const toolName = type.replace("tool-", "");

                  // MCPツールかどうか判定（"__" を含む）
                  const isMcpTool = toolName.includes("__");

                  if (isMcpTool) {
                    // MCPツール用コンポーネント（AI SDK 6 の状態形式を直接渡す）
                    return (
                      <McpToolCall
                        key={toolCallId}
                        toolName={toolName}
                        toolCallId={toolCallId}
                        state={
                          state as
                            | "input-streaming"
                            | "input-available"
                            | "output-available"
                            | "output-error"
                        }
                        input={toolPart.input}
                        output={toolPart.output}
                        outputRef={toolPart.outputRef}
                      />
                    );
                  }

                  // 入力中または実行中の状態
                  if (
                    state === "input-streaming" ||
                    state === "input-available"
                  ) {
                    // args を適切な型にキャスト（デフォルト値を設定）
                    const args = (toolPart.input as
                      | { title: string }
                      | undefined) ?? { title: "" };

                    return (
                      <div key={toolCallId}>
                        {toolName === "createDocument" ? (
                          <DocumentPreview
                            isReadonly={isReadonly}
                            args={args}
                          />
                        ) : toolName === "updateDocument" ? (
                          <DocumentToolCall
                            type="update"
                            args={args}
                            isReadonly={isReadonly}
                          />
                        ) : toolName === "requestSuggestions" ? (
                          <DocumentToolCall
                            type="request-suggestions"
                            args={args}
                            isReadonly={isReadonly}
                          />
                        ) : null}
                      </div>
                    );
                  }

                  // 結果が利用可能な状態
                  if (state === "output-available") {
                    // result を適切な型にキャスト
                    const result = toolPart.output as
                      | { id: string; title: string; kind: ArtifactKind }
                      | undefined;

                    return (
                      <div key={toolCallId}>
                        {toolName === "createDocument" ? (
                          <DocumentPreview
                            isReadonly={isReadonly}
                            result={
                              result as {
                                id: string;
                                title: string;
                                kind: ArtifactKind;
                              }
                            }
                          />
                        ) : toolName === "updateDocument" ? (
                          <DocumentToolResult
                            type="update"
                            result={
                              result as {
                                id: string;
                                title: string;
                                kind: ArtifactKind;
                              }
                            }
                            isReadonly={isReadonly}
                          />
                        ) : toolName === "requestSuggestions" ? (
                          <DocumentToolResult
                            type="request-suggestions"
                            result={
                              result as {
                                id: string;
                                title: string;
                                kind: ArtifactKind;
                              }
                            }
                            isReadonly={isReadonly}
                          />
                        ) : (
                          <pre>{JSON.stringify(result, null, 2)}</pre>
                        )}
                      </div>
                    );
                  }

                  // エラー状態
                  if (state === "output-error") {
                    return (
                      <div
                        key={toolCallId}
                        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                      >
                        Error: {String(toolPart.output)}
                      </div>
                    );
                  }
                }

                // Slack通知パート（DBから取得したカスタムパーツタイプ）
                // NOTE: AISDKのUIMessageパーツ型には含まれないためstring比較
                if ((type as string) === "slack-notification") {
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
              });
            })()}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    // ストリーミング中（isLoading=true）は常に再レンダーして、リアルタイム表示を保証
    if (nextProps.isLoading) return false;

    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

    return true;
  },
);

export const ThinkingMessage = ({ agentInfo }: { agentInfo?: AgentInfo }) => {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message mx-auto min-h-96 w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={role}
    >
      <div
        className={cx(
          "flex w-full gap-4 rounded-xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2",
          {
            "group-data-[role=user]/message:bg-muted": true,
          },
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center">
          {agentInfo ? (
            <EntityIcon
              iconPath={agentInfo.iconPath}
              type="agent"
              size="sm"
              alt={agentInfo.name}
            />
          ) : (
            <div className="ring-border bg-background flex size-8 items-center justify-center rounded-full ring-1">
              <SparklesIcon size={14} />
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 pt-2">
          <TypingIndicator className="text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
};
