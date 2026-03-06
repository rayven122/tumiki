"use client";

import type { UIMessage, TextUIPart } from "ai";
import { Button } from "@tumiki/ui/button";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Textarea } from "@tumiki/ui/textarea";
import { deleteTrailingMessages } from "@/app/[orgSlug]/chat/actions";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

export type MessageEditorProps = {
  message: UIMessage;
  setMode: Dispatch<SetStateAction<"view" | "edit">>;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
};

// AI SDK 6: contentプロパティは削除され、partsから取得する必要がある
const getMessageText = (message: UIMessage): string => {
  const textPart = message.parts?.find(
    (part): part is TextUIPart => part.type === "text",
  );
  return textPart?.text || "";
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  regenerate,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [draftContent, setDraftContent] = useState<string>(
    getMessageText(message),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        className="w-full resize-none overflow-hidden rounded-xl bg-transparent text-base! outline-hidden"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row justify-end gap-2">
        <Button
          variant="outline"
          className="h-fit px-3 py-2"
          onClick={() => {
            setMode("view");
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit px-3 py-2"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);

            await deleteTrailingMessages({
              id: message.id,
            });

            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                // AI SDK 6: ChatMessage型に合わせてmetadataを明示的に設定
                const updatedMessage: ChatMessage = {
                  id: message.id,
                  role: message.role,
                  parts: [{ type: "text" as const, text: draftContent }],
                  metadata: message.metadata as ChatMessage["metadata"],
                };

                return [...messages.slice(0, index), updatedMessage];
              }

              return messages;
            });

            setMode("view");
            regenerate();
          }}
        >
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
