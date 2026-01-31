"use client";

import type { UIMessage } from "ai";
import type { Attachment, ChatMessage } from "@/lib/types";
import cx from "classnames";
import type React from "react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

import { ArrowUpIcon, PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/chat/button";
import { Textarea } from "./ui/chat/textarea";
import equal from "fast-deep-equal";
import type { UseChatHelpers } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import type { VisibilityType } from "./visibility-selector";
import type { SessionData } from "~/auth";
import { CompactModelSelector } from "./compact-model-selector";
import { CompactMcpSelector } from "./compact-mcp-selector";
import { ChatOptionsMenu } from "./chat-options-menu";

type MultimodalInputProps = {
  chatId: string;
  orgSlug: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  /** TTS 再生中かどうか */
  isSpeaking?: boolean;
  /** TTS 再生を停止する関数 */
  stopSpeaking?: () => void;
  /** モデル選択関連（オプショナル - 指定しない場合はモデル/MCP選択UIを非表示） */
  session?: SessionData;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  /** MCPサーバー選択関連（オプショナル） */
  selectedMcpServerIds?: string[];
  onMcpServerSelectionChange?: (ids: string[]) => void;
  /** 新規チャットかどうか */
  isNewChat?: boolean;
};

function PureMultimodalInput({
  chatId,
  orgSlug,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  isSpeaking = false,
  stopSpeaking,
  session,
  selectedModelId,
  onModelChange,
  selectedMcpServerIds,
  onMcpServerSelectionChange,
  isNewChat = false,
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

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

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = "98px";
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    "",
  );

  // 初回マウント時のみlocalStorageから値を復元
  // 依存配列を空にすることで、無限ループを防ぎ、ハイドレーション後の1回のみ実行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/${orgSlug}/chat/${chatId}`);

    sendMessage({
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text" as const,
          text: input,
        },
      ],
    });

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    orgSlug,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `アップロードに失敗しました: ${response.status}`;
        toast.error(errorMessage);
        return undefined;
      }

      const data = await response.json();
      const { url, pathname, contentType } = data;

      return {
        url,
        name: pathname,
        contentType: contentType,
      };
    } catch (error) {
      console.error("ファイルアップロードエラー:", error);
      toast.error(
        "ファイルのアップロードに失敗しました。もう一度お試しください。",
      );
      return undefined;
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === "submitted") {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  return (
    <div className="relative flex w-full flex-col gap-4">
      <AnimatePresence>
        {!isAtBottom && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute bottom-28 left-1/2 z-50 -translate-x-1/2"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full"
              size="icon"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row items-end gap-2 overflow-x-scroll"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: "",
                name: filename,
                contentType: "",
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      {/* 入力フォームコンテナ */}
      <div className="bg-muted relative rounded-2xl dark:border-zinc-700">
        <Textarea
          data-testid="multimodal-input"
          ref={textareaRef}
          placeholder="メッセージを入力..."
          value={input}
          onChange={handleInput}
          className={cx(
            "max-h-[calc(75dvh)] min-h-[24px] resize-none overflow-hidden rounded-2xl border-none bg-transparent pb-14 text-base! focus-visible:ring-0",
            className,
          )}
          rows={2}
          autoFocus
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();

              if (status !== "ready") {
                toast.error("モデルの応答が完了するまでお待ちください");
              } else {
                submitForm();
              }
            }
          }}
        />

        {/* ツールバー */}
        <div className="absolute right-0 bottom-0 left-0 flex items-center justify-between p-2">
          {/* 左側: MCPサーバー選択 + オプションメニュー */}
          <div className="flex items-center gap-1">
            {session && selectedMcpServerIds && (
              <CompactMcpSelector
                selectedMcpServerIds={selectedMcpServerIds}
                onSelectionChange={onMcpServerSelectionChange}
                disabled={!isNewChat}
              />
            )}
            <ChatOptionsMenu
              chatId={chatId}
              orgSlug={orgSlug}
              isNewChat={isNewChat}
            />
          </div>

          {/* 右側: モデル選択 + 送信/停止ボタン */}
          <div className="flex items-center gap-2">
            {session && selectedModelId && (
              <CompactModelSelector
                session={session}
                selectedModelId={selectedModelId}
                onModelChange={onModelChange}
              />
            )}

            {status === "submitted" || isSpeaking ? (
              <StopButton
                stop={stop}
                setMessages={setMessages}
                stopSpeaking={stopSpeaking}
                isGenerating={status === "submitted"}
              />
            ) : (
              <SendButton
                input={input}
                submitForm={submitForm}
                uploadQueue={uploadQueue}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.isSpeaking !== nextProps.isSpeaking) return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
    if (!equal(prevProps.selectedMcpServerIds, nextProps.selectedMcpServerIds))
      return false;
    if (prevProps.isNewChat !== nextProps.isNewChat) return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="h-fit rounded-md rounded-bl-lg p-[7px] hover:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-900"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== "ready"}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
  stopSpeaking,
  isGenerating,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  stopSpeaking?: () => void;
  isGenerating: boolean;
}) {
  return (
    <Button
      data-testid="stop-button"
      className="h-fit rounded-full border p-1.5 dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        // テキスト生成中の場合は生成を停止
        if (isGenerating) {
          stop();
          setMessages((messages: ChatMessage[]) => messages);
        }
        // TTS 再生を停止（常に呼び出す）
        stopSpeaking?.();
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="h-fit rounded-full border p-1.5 dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
