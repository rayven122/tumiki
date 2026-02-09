import type { PrismaClient } from "@tumiki/db";
import { buildAgentAccessCondition } from "../utils";

type GetRecentExecutionsParams = {
  organizationId: string;
  userId: string;
  limit: number;
  cursor?: string;
};

/**
 * メッセージパーツからテキストを抽出
 * textタイプのパーツを優先し、最大60文字に切り詰める
 */
const extractTextFromParts = (parts: unknown): string | null => {
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (typeof part === "object" && part !== null) {
      const p = part as Record<string, unknown>;
      if (p.type === "text" && typeof p.text === "string") {
        const text = p.text.trim();
        return text.length > 60 ? text.substring(0, 60) + "..." : text;
      }
    }
  }

  return null;
};

/**
 * 直近の実行履歴を取得（カーソルベースページネーション）
 * 成功/失敗/実行中すべて含む
 */
export const getRecentExecutions = async (
  db: PrismaClient,
  params: GetRecentExecutionsParams,
) => {
  const { organizationId, userId, limit, cursor } = params;

  const recentExecutions = await db.agentExecutionLog.findMany({
    where: {
      agent: buildAgentAccessCondition(organizationId, userId),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    select: {
      id: true,
      chatId: true,
      success: true,
      agent: {
        select: {
          slug: true,
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // 次のページがあるか確認用に1件多く取得
  });

  const hasMore = recentExecutions.length > limit;
  const items = hasMore ? recentExecutions.slice(0, limit) : recentExecutions;

  // chatIdがある実行のメッセージを一括取得
  const chatIds = items
    .map((exec) => exec.chatId)
    .filter((id): id is string => id !== null);

  const latestMessages =
    chatIds.length > 0
      ? await db.message.findMany({
          where: {
            chatId: { in: chatIds },
            role: "assistant",
          },
          orderBy: { createdAt: "desc" },
          select: {
            chatId: true,
            parts: true,
          },
        })
      : [];

  // chatIdごとに最新メッセージをマップ化
  const messageMap = new Map<string, string | null>();
  for (const msg of latestMessages) {
    if (!messageMap.has(msg.chatId)) {
      messageMap.set(msg.chatId, extractTextFromParts(msg.parts));
    }
  }

  return {
    items: items.map(({ agent, ...rest }) => ({
      ...rest,
      agentSlug: agent.slug,
      latestMessage: rest.chatId ? (messageMap.get(rest.chatId) ?? null) : null,
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
};
