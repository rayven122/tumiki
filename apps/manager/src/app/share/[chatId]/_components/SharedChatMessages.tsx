"use client";

import type { UIMessage } from "ai";
import { Response } from "@/components/response";
import { cn, sanitizeText } from "@/lib/utils";
import { SparklesIcon } from "@/components/icons";
import { PreviewAttachment } from "@/components/preview-attachment";
import { MessageReasoning } from "@/components/message-reasoning";

type SharedChatMessagesProps = {
  messages: Array<UIMessage>;
};

export const SharedChatMessages = ({ messages }: SharedChatMessagesProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        メッセージがありません
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => (
        <SharedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};

const SharedMessage = ({ message }: { message: UIMessage }) => {
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
    <div
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          "flex w-full gap-4",
          message.role === "user" && "ml-auto max-w-2xl justify-end",
        )}
      >
        {message.role === "assistant" && (
          <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
            <div className="translate-y-px">
              <SparklesIcon size={14} />
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-4">
          {/* 添付ファイル */}
          {fileAttachments && fileAttachments.length > 0 && (
            <div className="flex flex-row justify-end gap-2">
              {fileAttachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}

          {/* メッセージパーツ */}
          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning") {
              // AI SDK 6: reasoning プロパティは text に変更
              return (
                <MessageReasoning
                  key={key}
                  isLoading={false}
                  reasoning={part.text}
                />
              );
            }

            if (type === "text") {
              return (
                <div
                  key={key}
                  data-testid="message-content"
                  className={cn("flex flex-col gap-4", {
                    "bg-primary text-primary-foreground w-fit rounded-xl px-3 py-2":
                      message.role === "user",
                  })}
                >
                  <Response>{sanitizeText(part.text)}</Response>
                </div>
              );
            }

            // tool-invocation などのその他のパートは表示しない
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
