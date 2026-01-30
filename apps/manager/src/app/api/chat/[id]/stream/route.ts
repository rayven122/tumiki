import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  JsonToSseTransformStream,
} from "ai";
import { auth } from "~/auth";
import {
  getChatById,
  getMessagesByChatId,
  getStreamIdsByChatId,
} from "@/lib/db/queries";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { after } from "next/server";
import type { Chat } from "@tumiki/db/prisma";
import { differenceInSeconds } from "date-fns";
import { ChatSDKError } from "@/lib/errors";
import { checkChatAccess } from "@/lib/auth/chat-permissions";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getStreamContext = () => {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL",
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * AI SDK 6のデフォルトURLパターン `/api/chat/{id}/stream` に対応するGETハンドラー
 * ストリームの再開をサポート
 */
export const GET = async (request: Request, context: RouteContext) => {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();
  const { id: chatId } = await context.params;

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  let chat: Chat | null;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  // 権限チェック（共通関数を使用）
  // 注: GET ハンドラーでは organizationId がリクエストに含まれないため、
  // チャット自体の organizationId を使用してアクセス権限をチェック
  const accessResult = checkChatAccess({
    chatUserId: chat.userId,
    chatVisibility: chat.visibility,
    chatOrganizationId: chat.organizationId,
    currentUserId: session.user.id,
    currentOrganizationId: chat.organizationId, // 同一組織内でのアクセスを仮定
  });

  if (!accessResult.canAccess) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const emptyStream = createUIMessageStream({
    execute: () => {
      // No-op: Empty stream for SSR resume functionality
    },
  });

  const stream = await streamContext.resumableStream(recentStreamId, () =>
    emptyStream.pipeThrough(new JsonToSseTransformStream()),
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return createUIMessageStreamResponse({ stream: emptyStream });
    }

    if (mostRecentMessage.role !== "assistant") {
      return createUIMessageStreamResponse({ stream: emptyStream });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return createUIMessageStreamResponse({ stream: emptyStream });
    }

    const restoredStream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({
          type: "data-append-message" as const,
          data: mostRecentMessage,
        });
      },
    });

    return createUIMessageStreamResponse({ stream: restoredStream });
  }

  // resumableStreamの場合はSSEヘッダーを手動で設定
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
