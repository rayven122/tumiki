"use client";

import type { UIMessage } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import type { Vote } from "@tumiki/db/prisma";
import type { ArtifactKind } from "./artifact";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { PencilEditIcon, SparklesIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import { Weather, type WeatherAtLocation } from "./weather";
import equal from "fast-deep-equal";
import { cn, sanitizeText } from "@/lib/utils";
import { Button } from "./ui/chat/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/chat/tooltip";
import { MessageEditor } from "./message-editor";
import { DocumentPreview } from "./document-preview";
import { MessageReasoning } from "./message-reasoning";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
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
            <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
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

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

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
                    <div key={key} className="flex flex-row items-start gap-2">
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
                        <span className="inline">
                          <Markdown>{sanitizeText(part.text)}</Markdown>
                          {showCursor && (
                            <span
                              className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-[blink_1s_step-end_infinite] bg-current align-middle"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div key={key} className="flex flex-row items-start gap-2">
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

              // AI SDK 6: tool-invocation は tool-${toolName} 形式に変更
              // ツールパーツの処理
              if (type.startsWith("tool-")) {
                // AI SDK 6のツールパーツ構造
                // 型アサーションには unknown を経由する必要がある
                const toolPart = part as unknown as {
                  type: `tool-${string}`;
                  toolCallId: string;
                  state: "call" | "partial-call" | "result" | "error";
                  input?: unknown;
                  output?: unknown;
                };
                const { toolCallId, state } = toolPart;
                // ツール名を抽出 (tool-getWeather → getWeather)
                const toolName = type.replace("tool-", "");

                if (state === "call" || state === "partial-call") {
                  // args を適切な型にキャスト（デフォルト値を設定）
                  const args = (toolPart.input as
                    | { title: string }
                    | undefined) ?? { title: "" };

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ["getWeather"].includes(toolName),
                      })}
                    >
                      {toolName === "getWeather" ? (
                        <Weather />
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
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

                if (state === "result") {
                  // AI SDK 6: result → output
                  // result を適切な型にキャスト
                  const result = toolPart.output as
                    | WeatherAtLocation
                    | { id: string; title: string; kind: ArtifactKind }
                    | undefined;

                  return (
                    <div key={toolCallId}>
                      {toolName === "getWeather" ? (
                        <Weather
                          weatherAtLocation={result as WeatherAtLocation}
                        />
                      ) : toolName === "createDocument" ? (
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
              }

              return null;
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
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
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message mx-auto min-h-96 w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
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
        <div className="ring-border flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <SparklesIcon size={14} />
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="text-muted-foreground flex flex-col gap-4">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
