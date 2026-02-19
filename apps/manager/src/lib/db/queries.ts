import "server-only";
import { db } from "@tumiki/db/server";
import type { ArtifactKind } from "@/lib/types";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { Message, Prisma, Suggestion } from "@tumiki/db/server";

export const saveChat = async ({
  id,
  userId,
  organizationId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  visibility: VisibilityType;
}) => {
  try {
    return await db.chat.create({
      data: {
        id,
        createdAt: new Date(),
        userId,
        organizationId,
        title,
        visibility,
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to save chat";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const deleteChatById = async ({ id }: { id: string }) => {
  try {
    await db.vote.deleteMany({
      where: { chatId: id },
    });

    await db.message.deleteMany({
      where: { chatId: id },
    });

    await db.stream.deleteMany({
      where: { chatId: id },
    });

    const deletedChat = await db.chat.delete({
      where: { id },
    });

    return deletedChat;
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to delete chat by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

/**
 * ユーザーのチャット一覧を取得
 * - 自分が作成したチャット（visibility問わず）
 * - 組織内共有チャット（ORGANIZATION visibility）
 */
export const getChatsByUserId = async ({
  id,
  organizationId,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  organizationId: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) => {
  try {
    const extendedLimit = limit + 1;

    let cursorDate: Date | null = null;
    let direction: "after" | "before" | null = null;

    if (startingAfter) {
      const chat = await db.chat.findUnique({ where: { id: startingAfter } });
      if (!chat)
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`,
        );
      cursorDate = chat.createdAt;
      direction = "after";
    } else if (endingBefore) {
      const chat = await db.chat.findUnique({ where: { id: endingBefore } });
      if (!chat)
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`,
        );
      cursorDate = chat.createdAt;
      direction = "before";
    }

    // カーソルベースのページネーション条件を生成
    const buildCursorCondition = () => {
      if (direction === "after") {
        return { createdAt: { gt: cursorDate! } };
      }
      if (direction === "before") {
        return { createdAt: { lt: cursorDate! } };
      }
      return null;
    };
    const cursorCondition = buildCursorCondition();

    const chats = await db.chat.findMany({
      where: {
        // 組織でフィルタ
        organizationId,
        // 自分のチャット または 組織内共有チャット
        OR: [{ userId: id }, { visibility: "ORGANIZATION" }],
        // カーソルベースのページネーション（条件がある場合のみ適用）
        ...(cursorCondition ? { createdAt: cursorCondition.createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: extendedLimit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            iconPath: true,
          },
        },
      },
    });

    const hasMore = chats.length > limit;
    return {
      chats: hasMore ? chats.slice(0, limit) : chats,
      hasMore,
    };
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to get chats by user id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getChatById = async ({ id }: { id: string }) => {
  try {
    return await db.chat.findUnique({
      where: { id },
      include: {
        mcpServers: {
          select: { id: true },
        },
        agent: {
          select: { id: true, name: true, iconPath: true },
        },
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to get chat by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const saveMessages = async ({
  messages,
}: {
  messages: Array<
    Message & {
      parts: Prisma.InputJsonValue;
      attachments: Prisma.InputJsonValue;
    }
  >;
}) => {
  try {
    return await db.message.createMany({
      data: messages,
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to save messages";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getMessagesByChatId = async ({ id }: { id: string }) => {
  try {
    return await db.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to get messages by chat id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const voteMessage = async ({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) => {
  try {
    const existingVote = await db.vote.findFirst({
      where: { messageId, chatId },
    });
    if (existingVote) {
      return await db.vote.update({
        where: {
          chatId_messageId: {
            chatId,
            messageId,
          },
        },
        data: { isUpvoted: type === "up" },
      });
    }
    return await db.vote.create({
      data: { chatId, messageId, isUpvoted: type === "up" },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to vote message";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getVotesByChatId = async ({ id }: { id: string }) => {
  try {
    return await db.vote.findMany({ where: { chatId: id } });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to get votes by chat id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const saveDocument = async ({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) => {
  try {
    return await db.document.create({
      data: {
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to save document";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getDocumentsById = async ({ id }: { id: string }) => {
  try {
    return await db.document.findMany({
      where: { id },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to get documents by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getDocumentById = async ({ id }: { id: string }) => {
  try {
    return await db.document.findFirst({
      where: { id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to get document by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const deleteDocumentsByIdAfterTimestamp = async ({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) => {
  try {
    await db.suggestion.deleteMany({
      where: {
        documentId: id,
        documentCreatedAt: {
          gt: timestamp,
        },
      },
    });

    return await db.document.deleteMany({
      where: {
        id,
        createdAt: {
          gt: timestamp,
        },
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to delete documents by id after timestamp";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const saveSuggestions = async ({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) => {
  try {
    return await db.suggestion.createMany({
      data: suggestions,
      skipDuplicates: true,
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to save suggestions";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getSuggestionsByDocumentId = async ({
  documentId,
}: {
  documentId: string;
}) => {
  try {
    return await db.suggestion.findMany({
      where: { documentId },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to get suggestions by document id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getMessageById = async ({ id }: { id: string }) => {
  try {
    return await db.message.findUnique({
      where: { id },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to get message by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const deleteMessagesByChatIdAfterTimestamp = async ({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) => {
  try {
    const messagesToDelete = await db.message.findMany({
      where: {
        chatId,
        createdAt: {
          gte: timestamp,
        },
      },
      select: { id: true },
    });

    const messageIds = messagesToDelete.map((m) => m.id);

    if (messageIds.length > 0) {
      await db.vote.deleteMany({
        where: {
          chatId,
          messageId: { in: messageIds },
        },
      });

      return await db.message.deleteMany({
        where: {
          chatId,
          id: { in: messageIds },
        },
      });
    }
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to delete messages by chat id after timestamp";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const updateChatVisiblityById = async ({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) => {
  try {
    return await db.chat.update({
      where: { id: chatId },
      data: { visibility },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to update chat visibility by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

/**
 * チャットに紐づくMCPサーバーを更新する
 * 暗黙的多対多リレーションを使用
 */
export const updateChatMcpServers = async (
  chatId: string,
  mcpServerIds: string[],
) => {
  try {
    return await db.chat.update({
      where: { id: chatId },
      data: {
        mcpServers: {
          set: mcpServerIds.map((id) => ({ id })),
        },
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to update chat MCP servers";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getMessageCountByUserId = async ({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) => {
  try {
    const threshold = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

    return await db.message.count({
      where: {
        createdAt: { gte: threshold },
        role: "user",
        chat: {
          userId: id,
        },
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to get message count by user id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const createStreamId = async ({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) => {
  try {
    await db.stream.create({
      data: {
        id: streamId,
        chatId,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Failed to create stream id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

export const getStreamIdsByChatId = async ({ chatId }: { chatId: string }) => {
  try {
    const streams = await db.stream.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    return streams.map(({ id }) => id);
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to get stream ids by chat id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};

/**
 * 公開チャットを取得（認証不要）
 * visibility が PUBLIC のチャットのみ取得可能
 */
export const getPublicChatById = async ({ id }: { id: string }) => {
  try {
    return await db.chat.findFirst({
      where: {
        id,
        visibility: "PUBLIC",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  } catch (error) {
    const cause =
      error instanceof Error
        ? error.message
        : "Failed to get public chat by id";
    throw new ChatSDKError("bad_request:database", cause);
  }
};
