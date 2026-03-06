/**
 * エージェント実行ログリポジトリ
 *
 * AgentExecutionLogのDB操作を担当
 */

import { db, type Prisma } from "@tumiki/db/server";

import { toError } from "../../../shared/errors/toError.js";
import { logError } from "../../../shared/logger/index.js";

/** テキストパーツ型（メッセージ保存用） */
type TextPart = {
  type: "text";
  text: string;
};

/** ツール呼び出しパーツ型（メッセージ保存用） */
type ToolCallPart = {
  type: string;
  toolCallId: string;
  state: "output-available";
  input: unknown;
  output: unknown;
};

/** Slack通知結果パーツ型（メッセージ保存用） */
type SlackNotificationPart = {
  type: "slack-notification";
  success: boolean;
  channelName?: string;
  errorCode?: string;
  errorMessage?: string;
  userAction?: string;
};

/** メッセージパーツの型 */
type MessagePart = TextPart | ToolCallPart | SlackNotificationPart;

/** 実行ログ作成（pending状態）のパラメータ */
export type CreatePendingLogParams = {
  agentId: string;
  scheduleId: string | null;
  modelId: string;
};

/** 実行ログ更新（完了時）のパラメータ（Chat/Message形式） */
export type UpdateExecutionLogWithChatParams = {
  executionLogId: string;
  organizationId: string;
  userId: string;
  agentId: string;
  agentName: string;
  modelId: string;
  success: boolean;
  durationMs: number;
  userMessage: string;
  assistantParts: MessagePart[];
};

/** 実行ログ更新（完了時）のパラメータ（メタデータのみ） */
export type UpdateExecutionLogSimpleParams = {
  executionLogId: string;
  success: boolean;
  durationMs: number;
};

/** 実行ログ更新の結果 */
export type UpdateExecutionLogResult = {
  chatId: string | null;
  failed: boolean;
};

/**
 * 実行開始時にpending状態のログを作成
 *
 * @returns 作成されたログのID（失敗時はnull）
 */
export const createPendingExecutionLog = async (
  params: CreatePendingLogParams,
): Promise<string | null> => {
  const { agentId, scheduleId, modelId } = params;

  try {
    const executionLog = await db.agentExecutionLog.create({
      data: {
        agentId,
        scheduleId,
        modelId,
        success: null, // pending状態
        durationMs: null,
      },
    });
    return executionLog.id;
  } catch (error) {
    logError("Failed to create pending execution log", toError(error), {
      agentId,
      scheduleId,
    });
    return null;
  }
};

/**
 * 実行完了時にログを更新（Chat/Message形式）
 * userIdがある場合に使用
 *
 * @returns 更新結果（chatId, failed）
 */
export const updateExecutionLogWithChat = async (
  params: UpdateExecutionLogWithChatParams,
): Promise<UpdateExecutionLogResult> => {
  const {
    executionLogId,
    organizationId,
    userId,
    agentId,
    agentName,
    modelId,
    success,
    durationMs,
    userMessage,
    assistantParts,
  } = params;

  try {
    // トランザクションでChat, Message作成とログ更新を一括実行
    const result = await db.$transaction(
      async (tx) => {
        const now = new Date();

        // Chatを作成（エージェント実行用）
        const chat = await tx.chat.create({
          data: {
            title: `${agentName} - ${now.toLocaleString("ja-JP")}`,
            createdAt: now,
            userId,
            organizationId,
            agentId,
            visibility: "PRIVATE",
          },
        });

        // メッセージ作成とログ更新を並列実行
        await Promise.all([
          // ユーザーメッセージを作成
          tx.message.create({
            data: {
              chatId: chat.id,
              role: "user",
              parts: [{ type: "text", text: userMessage }] as TextPart[],
              attachments: [],
              createdAt: now,
            },
          }),
          // アシスタントメッセージを作成
          tx.message.create({
            data: {
              chatId: chat.id,
              role: "assistant",
              parts: assistantParts as unknown as Prisma.InputJsonValue[],
              attachments: [],
              createdAt: new Date(now.getTime() + durationMs),
            },
          }),
          // AgentExecutionLogを更新（chatIdを紐付け、成功/失敗を記録）
          tx.agentExecutionLog.update({
            where: { id: executionLogId },
            data: {
              chatId: chat.id,
              modelId,
              success,
              durationMs,
            },
          }),
        ]);

        return { chatId: chat.id };
      },
      {
        timeout: 10000, // 10秒タイムアウト
        maxWait: 2000, // 最大待機時間2秒
      },
    );

    return { ...result, failed: false };
  } catch (error) {
    // ログ更新失敗は致命的エラーではないため、警告ログのみ
    logError("Failed to update execution log with chat", toError(error), {
      executionLogId,
      agentId,
    });
    return { chatId: null, failed: true };
  }
};

/**
 * 実行完了時にログを更新（メタデータのみ）
 * userIdがない場合（スケジュール実行等）に使用
 *
 * @returns 更新結果（chatId, failed）
 */
export const updateExecutionLogSimple = async (
  params: UpdateExecutionLogSimpleParams,
): Promise<UpdateExecutionLogResult> => {
  const { executionLogId, success, durationMs } = params;

  try {
    await db.agentExecutionLog.update({
      where: { id: executionLogId },
      data: {
        success,
        durationMs,
      },
    });
    return { chatId: null, failed: false };
  } catch (error) {
    logError("Failed to update execution log", toError(error), {
      executionLogId,
    });
    return { chatId: null, failed: true };
  }
};
