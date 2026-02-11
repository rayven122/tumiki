import type { PrismaClient } from "@tumiki/db";
import { buildAgentAccessCondition } from "../utils";

type GetRecentExecutionsParams = {
  organizationId: string;
  userId: string;
  limit: number;
  cursor?: string;
};

/** ツール呼び出し情報 */
type ToolCallInfo = {
  toolName: string;
  state: "success" | "error" | "running";
};

/** テキストを指定した長さに切り詰める */
const truncateText = (text: string, maxLength: number): string =>
  text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

/** メッセージパーツの型ガード */
const isMessagePart = (part: unknown): part is Record<string, unknown> =>
  typeof part === "object" && part !== null;

/** テキストパーツの型ガード */
const isTextPart = (
  part: Record<string, unknown>,
): part is { type: "text"; text: string } =>
  part.type === "text" && typeof part.text === "string";

/**
 * メッセージパーツからテキストを抽出
 * textタイプのパーツを優先し、最大60文字に切り詰める
 */
const extractTextFromParts = (parts: unknown): string | null => {
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (!isMessagePart(part)) continue;

    if (isTextPart(part)) {
      return truncateText(part.text.trim(), 60);
    }
  }

  return null;
};

/**
 * ツール名からMCPサーバー部分を除去して表示用ツール名を取得
 * 形式: serverId__prefix__toolName → toolName
 */
const parseToolDisplayName = (fullToolName: string): string => {
  const parts = fullToolName.split("__");
  if (parts.length >= 3) {
    // serverId__prefix__toolName 形式
    return parts.slice(2).join("__");
  }
  if (parts.length === 2) {
    // serverId__toolName 形式
    return parts[1] ?? fullToolName;
  }
  return fullToolName;
};

/** パーツからツール情報を抽出（単一パーツ処理） */
const extractToolFromPart = (
  part: Record<string, unknown>,
): ToolCallInfo | null => {
  const { type, toolName, state } = part;
  if (typeof type !== "string") return null;

  // dynamic-tool タイプ
  if (type === "dynamic-tool") {
    if (typeof toolName === "string" && typeof state === "string") {
      return {
        toolName: parseToolDisplayName(toolName),
        state: mapToolState(state),
      };
    }
    return null;
  }

  // tool-* タイプ
  if (type.startsWith("tool-") && typeof state === "string") {
    const extractedToolName = type.replace("tool-", "");
    return {
      toolName: parseToolDisplayName(extractedToolName),
      state: mapToolState(state),
    };
  }

  return null;
};

/**
 * メッセージパーツからツール呼び出し情報を抽出
 */
const extractToolCallsFromParts = (parts: unknown): ToolCallInfo[] => {
  if (!Array.isArray(parts)) return [];

  return parts
    .filter(
      (part): part is Record<string, unknown> =>
        typeof part === "object" && part !== null,
    )
    .map(extractToolFromPart)
    .filter((tool): tool is ToolCallInfo => tool !== null);
};

/**
 * ツール状態をマッピング
 */
const mapToolState = (state: string): "success" | "error" | "running" => {
  switch (state) {
    case "output-available":
      return "success";
    case "output-error":
    case "error":
      return "error";
    default:
      return "running";
  }
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
      agentId: true,
      chatId: true,
      success: true,
      modelId: true,
      durationMs: true,
      agent: {
        select: {
          name: true,
          slug: true,
          iconPath: true,
          estimatedDurationMs: true,
        },
      },
      schedule: {
        select: {
          name: true,
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

  const messages =
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

  // chatIdごとに最新メッセージとツール呼び出しをマップ化
  const messageMap = new Map<string, string | null>();
  const toolCallsMap = new Map<string, ToolCallInfo[]>();

  for (const msg of messages) {
    // 最新メッセージ（テキスト）の抽出
    if (!messageMap.has(msg.chatId)) {
      messageMap.set(msg.chatId, extractTextFromParts(msg.parts));
    }
    // ツール呼び出し情報の抽出（全メッセージから収集）
    const existingToolCalls = toolCallsMap.get(msg.chatId) ?? [];
    const newToolCalls = extractToolCallsFromParts(msg.parts);
    toolCallsMap.set(msg.chatId, [...existingToolCalls, ...newToolCalls]);
  }

  return {
    items: items.map(({ agent, schedule, ...rest }) => ({
      ...rest,
      agentName: agent.name,
      agentSlug: agent.slug,
      agentIconPath: agent.iconPath,
      estimatedDurationMs: agent.estimatedDurationMs,
      scheduleName: schedule?.name ?? null,
      latestMessage: rest.chatId ? (messageMap.get(rest.chatId) ?? null) : null,
      toolCalls: rest.chatId ? (toolCallsMap.get(rest.chatId) ?? []) : [],
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
};
