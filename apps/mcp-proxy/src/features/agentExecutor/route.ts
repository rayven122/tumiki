/**
 * エージェント実行APIルート（ストリーミング対応）
 *
 * クライアントから直接呼び出されるエンドポイント
 * - POST /agent/:agentId - エージェントのストリーミング実行
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  type UIMessageStreamWriter,
  type Tool,
} from "ai";

import { db, type Prisma } from "@tumiki/db/server";

import type { HonoEnv } from "../../shared/types/honoEnv.js";
import {
  AGENT_EXECUTION_CONFIG,
  resolveModelId,
} from "../../shared/constants/config.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import { toError } from "../../shared/errors/toError.js";
import { generateCUID } from "../../shared/utils/cuid.js";
import { verifyChatAuth } from "../chat/index.js";
import { getChatMcpTools } from "../chat/index.js";
import { buildStreamTextConfig } from "../execution/shared/index.js";
import { buildSystemPrompt } from "./commands/index.js";
import { notifyAgentExecution } from "../notification/index.js";
import type { ExecutionTrigger } from "./types.js";
import { buildSlackNotificationPart } from "./commands/executeAgent/buildMessageParts.js";

/** 最大ツール実行ステップ数 */
const MAX_TOOL_STEPS = AGENT_EXECUTION_CONFIG.MAX_TOOL_STEPS;

/** エージェント実行タイムアウト */
const EXECUTION_TIMEOUT_MS = AGENT_EXECUTION_CONFIG.EXECUTION_TIMEOUT_MS;

/**
 * リクエストボディスキーマ
 */
const agentRunRequestSchema = z.object({
  /** 組織ID */
  organizationId: z.string().min(1),
  /** 実行メッセージ（省略時はデフォルトメッセージ） */
  message: z.string().optional(),
});

export const agentExecutorRoute = new Hono<HonoEnv>().post(
  "/agent/:agentId",
  async (c) => {
    // パスパラメータからagentIdを取得
    const agentId = c.req.param("agentId");

    // リクエストボディをパース
    let requestBody;
    try {
      const json: unknown = await c.req.json();
      requestBody = agentRunRequestSchema.parse(json);
    } catch (error) {
      logError("Failed to parse request body", toError(error));
      return c.json(
        { code: "bad_request:api", message: "Invalid request body" },
        400,
      );
    }

    const { organizationId, message } = requestBody;

    // JWT認証
    const authResult = await verifyChatAuth(
      c.req.header("Authorization"),
      organizationId,
    );

    if (!authResult.success) {
      const errorResponse = {
        code: `${authResult.error.code}:agent`,
        message: authResult.error.message,
      };
      // 認証エラーコードに応じたHTTPステータスを返す
      switch (authResult.error.code) {
        case "unauthorized":
          return c.json(errorResponse, 401);
        case "forbidden":
          return c.json(errorResponse, 403);
        default:
          return c.json(errorResponse, 400);
      }
    }

    const { userId } = authResult.context;

    try {
      // エージェント情報を取得
      const agent = await db.agent.findFirst({
        where: {
          id: agentId,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          systemPrompt: true,
          modelId: true,
          mcpServers: { select: { id: true } },
        },
      });

      if (!agent) {
        return c.json(
          { code: "not_found:agent", message: "Agent not found" },
          404,
        );
      }

      // "auto" または未設定の場合はデフォルトモデルに解決
      const modelId = resolveModelId(agent.modelId);
      const userMessage = message ?? "タスクを実行してください。";
      // ストリーミング実行は手動実行として扱う
      const trigger: ExecutionTrigger = { type: "manual", userId };
      const systemPrompt = buildSystemPrompt(
        trigger,
        agent.systemPrompt ?? undefined,
      );

      // MCPツールを取得
      const mcpServerIds = agent.mcpServers.map((s) => s.id);
      let mcpTools: Record<string, Tool> = {};
      let mcpToolNames: string[] = [];

      if (mcpServerIds.length > 0) {
        const mcpResult = await getChatMcpTools({
          mcpServerIds,
          organizationId,
          userId,
        });
        mcpTools = mcpResult.tools;
        mcpToolNames = mcpResult.toolNames;

        logInfo("MCP tools loaded for agent execution", {
          agentId,
          toolCount: mcpToolNames.length,
          toolNames: mcpToolNames,
        });
      }

      // 実行ログ用のチャットIDとログIDを事前生成
      const chatId = generateCUID();
      const executionLogId = generateCUID();
      const startTime = Date.now();

      // 実行開始時にAgentExecutionLogを作成（success: null = 実行中）
      // chatIdは後でonFinishでChatを作成した後に更新する
      await db.agentExecutionLog.create({
        data: {
          id: executionLogId,
          agentId,
          modelId,
          success: null, // 実行中を示す
        },
      });

      logInfo("Agent execution started", {
        agentId,
        executionLogId,
        chatId,
      });

      // タイムアウト用のAbortController
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort(new Error("Agent execution timed out"));
      }, EXECUTION_TIMEOUT_MS);

      // LLM呼び出し設定を構築
      const llmConfig = buildStreamTextConfig({
        modelId,
        systemPrompt,
        mcpToolNames,
        mcpTools,
        abortSignal: abortController.signal,
      });

      // Slack通知結果を保持（execute内で設定、onFinishで使用）
      let slackNotificationResult: Awaited<
        ReturnType<typeof notifyAgentExecution>
      > | null = null;

      // ストリーミングレスポンスを作成
      const stream = createUIMessageStream({
        generateId: generateCUID,
        execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
          logInfo("Agent execution execute started", { agentId, chatId });
          try {
            const result = streamText({
              ...llmConfig,
              prompt: userMessage,
              stopWhen: stepCountIs(MAX_TOOL_STEPS),
            });

            // streamTextの結果をUIMessageStreamにマージ
            const uiMessageStream = result.toUIMessageStream({
              sendReasoning: true,
            });

            // ストリームをマージ（merge()はvoidを返すため、完了はonFinish内で検知）
            writer.merge(uiMessageStream);

            // AIストリーム完了後にSlack通知を送信
            const durationMs = Date.now() - startTime;
            slackNotificationResult = await notifyAgentExecution({
              agentId,
              agentName: agent.name,
              organizationId,
              success: true,
              durationMs,
              toolNames: mcpToolNames,
              chatId,
            });

            logInfo("Agent execution stream merged with Slack notification", {
              agentId,
              chatId,
              slackAttempted: slackNotificationResult.attempted,
              slackSuccess: slackNotificationResult.success,
            });
          } finally {
            // タイムアウトタイマーをクリア
            clearTimeout(timeoutId);
            logInfo("Agent execution execute completed", { agentId, chatId });
          }
        },
        onFinish: async ({ messages: finishedMessages }) => {
          const durationMs = Date.now() - startTime;

          try {
            // Slack通知結果をパーツに変換（executeで既に送信済み）
            const slackNotificationPart = slackNotificationResult
              ? buildSlackNotificationPart(slackNotificationResult)
              : null;

            // トランザクションでChat, Message, AgentExecutionLogを一括作成
            await db.$transaction(async (tx) => {
              const now = new Date();

              // Chatを作成
              await tx.chat.create({
                data: {
                  id: chatId,
                  title: `${agent.name} - ${now.toLocaleString("ja-JP")}`,
                  createdAt: now,
                  userId,
                  organizationId,
                  agentId,
                  visibility: "PRIVATE",
                },
              });

              // ユーザーメッセージを作成
              await tx.message.create({
                data: {
                  chatId,
                  role: "user",
                  parts: [{ type: "text", text: userMessage }],
                  attachments: [],
                  createdAt: now,
                },
              });

              // アシスタントメッセージを作成（完了したメッセージのみ）
              const assistantMessages = finishedMessages.filter(
                (msg) => msg.role === "assistant",
              );

              if (assistantMessages.length > 0) {
                // 最後のアシスタントメッセージにSlack通知結果を追加
                const messagesWithSlackResult = assistantMessages.map(
                  (msg, index) => {
                    const isLastMessage =
                      index === assistantMessages.length - 1;
                    const baseParts =
                      msg.parts as unknown as Prisma.InputJsonValue[];
                    // 最後のメッセージにSlack通知結果パーツを追加
                    const parts =
                      isLastMessage && slackNotificationPart
                        ? [
                            ...baseParts,
                            slackNotificationPart as unknown as Prisma.InputJsonValue,
                          ]
                        : baseParts;

                    return {
                      id: msg.id,
                      chatId,
                      role: "assistant" as const,
                      parts,
                      attachments: [],
                      createdAt: now,
                    };
                  },
                );

                await tx.message.createMany({
                  data: messagesWithSlackResult,
                });
              }

              // AgentExecutionLogを更新（実行完了 + chatId紐付け）
              await tx.agentExecutionLog.update({
                where: { id: executionLogId },
                data: {
                  chatId,
                  success: true,
                  durationMs,
                },
              });
            });

            logInfo("Agent execution completed and logged", {
              agentId,
              chatId,
              durationMs,
              slackNotificationAttempted: slackNotificationResult?.attempted,
              slackNotificationSuccess: slackNotificationResult?.success,
            });
          } catch (error) {
            // ログ保存失敗は致命的エラーではないため、警告ログのみ
            logError("Failed to save agent execution log", toError(error), {
              agentId,
              chatId,
            });
          }
        },
        onError: (error) => {
          const isTimeout =
            error instanceof Error && error.message.includes("timed out");

          // エラーメッセージを生成（ネストされた三項演算子を避ける）
          let errorMessage: string;
          if (isTimeout) {
            errorMessage = "エージェント実行がタイムアウトしました（5分）";
          } else if (error instanceof Error) {
            errorMessage = error.message;
          } else {
            errorMessage = "Unknown error";
          }

          logError("Agent execution stream error", toError(error), {
            agentId,
            isTimeout,
          });

          // エラー時は実行ログを失敗で更新（非同期だがコールバックは同期のみ対応）
          const durationMs = Date.now() - startTime;
          db.agentExecutionLog
            .update({
              where: { id: executionLogId },
              data: {
                success: false,
                durationMs,
              },
            })
            .then(() => {
              // Slack通知を送信（失敗時）
              void notifyAgentExecution({
                agentId,
                agentName: agent.name,
                organizationId,
                success: false,
                durationMs,
                errorMessage,
                toolNames: mcpToolNames,
                chatId,
              });
            })
            .catch((updateError) => {
              logError(
                "Failed to update execution log on error",
                toError(updateError),
                { agentId, executionLogId },
              );
            });

          return `Error: ${errorMessage}`;
        },
      });

      return createUIMessageStreamResponse({ stream });
    } catch (error) {
      logError("Agent execution error", toError(error), { agentId });
      return c.json(
        {
          code: "internal_error:agent",
          message: "An error occurred while executing the agent.",
          cause: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  },
);

/**
 * 古い「稼働中」のエージェント実行をクリーンアップする
 *
 * サーバー再起動時などに、前回の実行が完了しなかったレコードを
 * タイムアウト扱いで失敗にマークする
 */
export const cleanupStaleExecutions = async (): Promise<void> => {
  try {
    // タイムアウト時間より前に開始された、まだ完了していない実行を検索
    const staleThreshold = new Date(Date.now() - EXECUTION_TIMEOUT_MS);

    const result = await db.agentExecutionLog.updateMany({
      where: {
        success: null, // 実行中のもの
        createdAt: {
          lt: staleThreshold, // タイムアウト時間より前に開始
        },
      },
      data: {
        success: false,
        durationMs: EXECUTION_TIMEOUT_MS,
      },
    });

    if (result.count > 0) {
      logInfo("Cleaned up stale agent executions", {
        count: result.count,
        staleThreshold: staleThreshold.toISOString(),
      });
    }
  } catch (error) {
    logError("Failed to cleanup stale agent executions", toError(error));
  }
};
