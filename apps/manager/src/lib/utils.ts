import type { Document } from "@tumiki/db/prisma";
import { ChatSDKError, type ErrorCode } from "./errors";
import { createId } from "@paralleldrive/cuid2";

// cn関数は @tumiki/ui から再エクスポート
export { cn } from "@tumiki/ui";

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
      // JSONパースを試みる
      let errorData: { code?: ErrorCode; cause?: string; error?: string } = {};
      try {
        errorData = (await response.json()) as {
          code?: ErrorCode;
          cause?: string;
          error?: string;
        };
      } catch {
        // JSONパースに失敗した場合はデフォルトエラー
      }

      // codeがある場合はChatSDKErrorを使用、ない場合はフォールバック
      if (errorData.code) {
        throw new ChatSDKError(errorData.code, errorData.cause);
      }

      // 500エラーなどでcodeがない場合のフォールバック
      const errorMessage =
        errorData.error ?? `Request failed with status ${response.status}`;
      throw new ChatSDKError("bad_request:api", errorMessage);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
};

export function generateCUID(): string {
  // NOTE: Change to cuid v1
  return "c" + createId();
}

export function generateMessageId(): string {
  // メッセージID用のユニークID生成（msg_プレフィックス）
  return "msg_" + createId();
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index]?.createdAt;
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}
