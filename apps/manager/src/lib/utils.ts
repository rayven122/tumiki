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

async function fetchWithErrorHandlersBase(
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
}

// Interface for fetch with preconnect support
interface FetchWithPreconnect {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  preconnect?: (
    url: string | URL,
    options?: {
      dns?: boolean;
      tcp?: boolean;
      http?: boolean;
      https?: boolean;
    },
  ) => void;
}

// Export enhanced fetch with error handlers
export const fetchWithErrorHandlers =
  fetchWithErrorHandlersBase as FetchWithPreconnect;

// Safely add preconnect if available in the global fetch
// Using a type guard to ensure type safety
if (typeof globalThis !== "undefined" && globalThis.fetch) {
  const globalFetch = globalThis.fetch as {
    preconnect?: (
      url: string | URL,
      options?: {
        dns?: boolean;
        tcp?: boolean;
        http?: boolean;
        https?: boolean;
      },
    ) => void;
  };

  if (globalFetch.preconnect && typeof globalFetch.preconnect === "function") {
    // Use Object.defineProperty for safer assignment
    Object.defineProperty(fetchWithErrorHandlers, "preconnect", {
      value: globalFetch.preconnect,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
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
