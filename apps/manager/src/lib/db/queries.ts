import "server-only";
import { db } from "@/server/db";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { Message, Prisma, Suggestion } from "@prisma/client";

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.chat.create({
      data: {
        id,
        createdAt: new Date(),
        userId,
        title,
        visibility,
      },
    });
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
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
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id",
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
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

    const chats = await db.chat.findMany({
      where: {
        userId: id,
        createdAt:
          direction === "after"
            ? { gt: cursorDate! }
            : direction === "before"
              ? { lt: cursorDate! }
              : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: extendedLimit,
    });

    const hasMore = chats.length > limit;
    return {
      chats: hasMore ? chats.slice(0, limit) : chats,
      hasMore,
    };
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id",
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    return await db.chat.findUnique({ where: { id } });
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<
    Message & {
      parts: Prisma.InputJsonValue;
      attachments: Prisma.InputJsonValue;
    }
  >;
}) {
  try {
    return await db.message.createMany({
      data: messages,
    });
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id",
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
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
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.vote.findMany({ where: { chatId: id } });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id",
    );
  }
}

export async function saveDocument({
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
}) {
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
  } catch {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    return await db.document.findMany({
      where: { id },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id",
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    return await db.document.findFirst({
      where: { id },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id",
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
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
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp",
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.suggestion.createMany({
      data: suggestions,
      skipDuplicates: true, // 必要に応じて追加
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions",
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db.suggestion.findMany({
      where: { documentId },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id",
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.message.findUnique({
      where: { id },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id",
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
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
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp",
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.chat.update({
      where: { id: chatId },
      data: { visibility },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id",
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const threshold = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

    const count = await db.message.count({
      where: {
        createdAt: { gte: threshold },
        role: "user",
        chat: {
          userId: id,
        },
      },
    });

    return count;
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id",
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db.stream.create({
      data: {
        id: streamId,
        chatId,
        createdAt: new Date(),
      },
    });
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id",
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streams = await db.stream.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    return streams.map(({ id }) => id);
  } catch {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id",
    );
  }
}
