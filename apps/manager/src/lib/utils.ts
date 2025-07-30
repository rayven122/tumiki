import type { CoreAssistantMessage, CoreToolMessage, UIMessage } from "ai";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Document } from "@tumiki/db/prisma";
import { ChatSDKError, type ErrorCode } from "./errors";
import { createId } from "@paralleldrive/cuid2";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = (await response.json()) as {
      code: ErrorCode;
      cause: string;
    };
    throw new ChatSDKError(code, cause);
  }

  return response.json() as Promise<T>;
};

export const fetchWithErrorHandlers = async function (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = (await response.json()) as {
        code: ErrorCode;
        cause: string;
      };
      throw new ChatSDKError(code, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
} as typeof fetch;

// Add preconnect property if it exists on the original fetch
// fetchを型安全に拡張
type FetchWithPreconnect = typeof fetch & {
  preconnect?: (url: string) => void;
};

const originalFetch = fetch as FetchWithPreconnect;
if (
  "preconnect" in originalFetch &&
  typeof originalFetch.preconnect === "function"
) {
  // fetchWithErrorHandlersを拡張してpreconnectプロパティを追加
  const extendedFetch = fetchWithErrorHandlers as FetchWithPreconnect;
  extendedFetch.preconnect = originalFetch.preconnect;
}

export function generateCUID(): string {
  // NOTE: Change to cuid v1
  return "c" + createId();
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index]?.createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}
