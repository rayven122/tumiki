import type { PrismaClient } from "@tumiki/db";
import { buildAgentAccessCondition } from "../utils";

type GetAllRunningParams = {
  organizationId: string;
  userId: string;
};

/**
 * メッセージパーツからテキストを抽出
 * textタイプのパーツを優先し、最大50文字に切り詰める
 */
const extractTextFromParts = (parts: unknown): string | null => {
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (typeof part === "object" && part !== null) {
      const p = part as Record<string, unknown>;
      // textタイプのパーツからテキストを抽出
      if (p.type === "text" && typeof p.text === "string") {
        const text = p.text.trim();
        return text.length > 50 ? text.substring(0, 50) + "..." : text;
      }
    }
  }

  return null;
};

/**
 * 全エージェントの稼働中実行を取得（進捗計算用データ含む）
 * success: null のレコードは実行中を表す
 */
export const getAllRunningExecutions = async (
  db: PrismaClient,
  params: GetAllRunningParams,
) => {
  const { organizationId, userId } = params;

  const runningExecutions = await db.agentExecutionLog.findMany({
    where: {
      success: null,
      agent: buildAgentAccessCondition(organizationId, userId),
    },
    select: {
      id: true,
      agentId: true,
      chatId: true,
      scheduleId: true,
      schedule: { select: { name: true } },
      agent: {
        select: {
          name: true,
          slug: true,
          iconPath: true,
          estimatedDurationMs: true,
        },
      },
      modelId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // chatIdがある実行のメッセージを一括取得（最新のアシスタントメッセージ）
  const chatIds = runningExecutions
    .map((exec) => exec.chatId)
    .filter((id): id is string => id !== null);

  // 各chatIdごとに最新のアシスタントメッセージを取得（distinctでDB側でフィルタリング）
  const latestMessages =
    chatIds.length > 0
      ? await db.message.findMany({
          where: {
            chatId: { in: chatIds },
            role: "assistant",
          },
          orderBy: { createdAt: "desc" },
          distinct: ["chatId"],
          select: {
            chatId: true,
            parts: true,
          },
        })
      : [];

  // chatIdごとに最新メッセージをマップ化
  const messageMap = new Map<string, string | null>();
  for (const msg of latestMessages) {
    messageMap.set(msg.chatId, extractTextFromParts(msg.parts));
  }

  return runningExecutions.map(({ schedule, agent, ...rest }) => ({
    ...rest,
    scheduleName: schedule?.name ?? null,
    agentName: agent.name,
    agentSlug: agent.slug,
    agentIconPath: agent.iconPath,
    estimatedDurationMs: agent.estimatedDurationMs,
    latestMessage: rest.chatId ? (messageMap.get(rest.chatId) ?? null) : null,
  }));
};
