/**
 * エージェント実行コマンド
 *
 * LLMを使用してエージェントを実行し、MCPツールを呼び出す
 * 実行結果はChat/Message形式で保存される
 */

import { streamText, type Tool } from "ai";
import { randomUUID } from "crypto";

import { gateway } from "../../../../infrastructure/ai/index.js";
import {
  createPendingExecutionLog,
  findAgentForExecution,
  updateAgentEstimatedDuration,
  updateExecutionLogSimple,
  updateExecutionLogWithChat,
  type AgentForExecution,
} from "../../../../infrastructure/db/repositories/index.js";
import { AGENT_EXECUTION_CONFIG } from "../../../../shared/constants/config.js";
import { toError } from "../../../../shared/errors/toError.js";
import { logError, logInfo } from "../../../../shared/logger/index.js";
import { parseIntWithDefault } from "../../../../shared/utils/parseIntWithDefault.js";
import { getChatMcpTools } from "../../../chat/chatMcpTools.js";
import {
  notifyAgentExecution,
  type AgentExecutionNotifyParams,
} from "../../../notification/index.js";
import type {
  ExecuteAgentRequest,
  ExecuteAgentResult,
  ExecutionTrigger,
} from "../../types.js";
import {
  buildSystemPrompt,
  buildMessageParts,
  buildSlackNotificationPart,
  consumeStreamText,
  getErrorMessage,
  isAbortError,
  TIMEOUT_ERROR_MESSAGE,
  type MessagePart,
} from "./index.js";

/** エージェント実行用のデフォルトモデル（環境変数で上書き可能） */
const DEFAULT_AGENT_MODEL =
  process.env.AGENT_DEFAULT_MODEL ?? AGENT_EXECUTION_CONFIG.DEFAULT_MODEL;

/** 自動モデル選択を示すID */
const AUTO_MODEL_ID = AGENT_EXECUTION_CONFIG.AUTO_MODEL_ID;

/** 実行タイムアウト（ミリ秒、環境変数で上書き可能） */
const EXECUTION_TIMEOUT_MS = parseIntWithDefault(
  process.env.AGENT_EXECUTION_TIMEOUT_MS,
  AGENT_EXECUTION_CONFIG.EXECUTION_TIMEOUT_MS,
);

/** エージェントの最大ツール呼び出しステップ数（環境変数で上書き可能） */
const MAX_TOOL_STEPS = parseIntWithDefault(
  process.env.AGENT_MAX_TOOL_STEPS,
  AGENT_EXECUTION_CONFIG.MAX_TOOL_STEPS,
);

/** デフォルトの実行開始メッセージ */
const DEFAULT_EXECUTION_MESSAGE = "定期実行タスクを開始してください。";

/** トリガーからスケジュールIDを取得 */
const getScheduleId = (trigger: ExecutionTrigger): string | null =>
  trigger.type === "schedule" ? trigger.scheduleId : null;

/** トリガーからユーザーIDを取得 */
const getUserId = (trigger: ExecutionTrigger): string | null =>
  trigger.type === "manual" ? trigger.userId : null;

/**
 * エージェントを実行
 *
 * 実行開始時にpending状態のログを作成し、完了時に更新する。
 * これにより「稼働中」の実行をリアルタイムで表示できる。
 *
 * @param request - 実行リクエスト
 * @returns 実行結果
 */
export const executeAgentCommand = async (
  request: ExecuteAgentRequest,
): Promise<ExecuteAgentResult> => {
  const executionId = randomUUID();
  const startTime = Date.now();
  const scheduleId = getScheduleId(request.trigger);
  const userId = getUserId(request.trigger);

  // pending状態のログID（実行開始後に設定）
  let pendingLogId: string | null = null;
  // エージェント情報をエラー時に再利用するため保持
  let agentInfo: AgentForExecution | null = null;
  // 実行パラメータをエラー時に再利用するため保持
  let modelId: string = DEFAULT_AGENT_MODEL;
  let userMessage: string = DEFAULT_EXECUTION_MESSAGE;
  let effectiveUserId: string | null = null;

  logInfo("Starting agent execution", {
    executionId,
    agentId: request.agentId,
    triggerType: request.trigger.type,
  });

  try {
    const agent = await findAgentForExecution(request.agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    // エラー時に再利用するため保持
    agentInfo = agent;

    const systemPrompt = buildSystemPrompt(
      request.trigger,
      agent.systemPrompt ?? undefined,
    );
    // "auto" または未設定の場合はデフォルトモデルに解決
    modelId =
      agent.modelId && agent.modelId !== AUTO_MODEL_ID
        ? agent.modelId
        : DEFAULT_AGENT_MODEL;
    userMessage = request.message ?? DEFAULT_EXECUTION_MESSAGE;
    effectiveUserId = userId ?? agent.createdById;

    // 実行開始時にpending状態のログを作成（success: null）
    pendingLogId = await createPendingExecutionLog({
      agentId: request.agentId,
      scheduleId,
      modelId,
    });

    logInfo("Pending execution log created", {
      executionId,
      pendingLogId,
      agentId: request.agentId,
    });

    // MCPツールの取得（chatMcpToolsを使用、dynamicSearch対応）
    const mcpServerIds = agent.mcpServers.map((s) => s.id);

    let mcpTools: Record<string, Tool> = {};
    if (mcpServerIds.length > 0 && effectiveUserId) {
      try {
        const mcpResult = await getChatMcpTools({
          mcpServerIds,
          organizationId: agent.organizationId,
          userId: effectiveUserId,
        });
        mcpTools = mcpResult.tools;

        logInfo("MCP tools loaded", {
          executionId,
          agentId: request.agentId,
          toolCount: mcpResult.toolNames.length,
          toolNames: mcpResult.toolNames,
        });
      } catch (mcpError) {
        logError(
          "Failed to load MCP tools, continuing without tools",
          toError(mcpError),
          {
            executionId,
            agentId: request.agentId,
            mcpServerIds,
          },
        );
        // MCPツールなしで実行を継続
      }
    }

    const hasMcpTools = Object.keys(mcpTools).length > 0;

    logInfo("Agent configuration loaded", {
      executionId,
      agentId: request.agentId,
      modelId,
      mcpServerCount: agent.mcpServers.length,
      hasMcpTools,
    });

    // タイムアウト用のAbortController
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort(new Error(TIMEOUT_ERROR_MESSAGE));
    }, EXECUTION_TIMEOUT_MS);

    let text: string;
    let assistantParts: MessagePart[];
    try {
      // LLM呼び出し（streamTextを使用、abortSignalでタイムアウト時にキャンセル）
      const streamResult = streamText({
        model: gateway(modelId),
        system: systemPrompt,
        prompt: userMessage,
        abortSignal: abortController.signal,
        ...(hasMcpTools && {
          tools: mcpTools,
          maxSteps: MAX_TOOL_STEPS,
        }),
      });

      const result = await consumeStreamText(streamResult);

      // 出力テキストとメッセージパーツを生成
      text = result.text;
      assistantParts = buildMessageParts(result);
    } finally {
      // タイムアウトタイマーをクリア（正常完了時もエラー時も実行）
      clearTimeout(timeoutId);
    }

    const durationMs = Date.now() - startTime;

    logInfo("Agent execution completed", {
      executionId,
      agentId: request.agentId,
      durationMs,
      outputLength: text.length,
    });

    // ログを更新（effectiveUserIdがある場合はChat/Message形式、ない場合はメタデータのみ）
    let chatId: string | null = null;
    if (pendingLogId) {
      if (effectiveUserId) {
        const logResult = await updateExecutionLogWithChat({
          executionLogId: pendingLogId,
          organizationId: agent.organizationId,
          userId: effectiveUserId,
          agentId: request.agentId,
          agentName: agent.name,
          modelId,
          success: true,
          durationMs,
          userMessage,
          assistantParts,
        });
        chatId = logResult.chatId;
      } else {
        await updateExecutionLogSimple({
          executionLogId: pendingLogId,
          success: true,
          durationMs,
        });
      }
    }

    // 成功時はエージェントの推定実行時間を更新
    try {
      await updateAgentEstimatedDuration(request.agentId, durationMs);
    } catch (updateError) {
      // 推定時間の更新失敗は致命的ではないため、警告ログのみ
      logError("Failed to update estimated duration", toError(updateError), {
        agentId: request.agentId,
        durationMs,
      });
    }

    // Slack通知を送信して結果を取得
    const usedToolNames = Object.keys(mcpTools);
    const slackResult = await notifyAgentExecution({
      agentId: request.agentId,
      agentName: agent.name,
      organizationId: agent.organizationId,
      success: true,
      durationMs,
      toolNames: usedToolNames.length > 0 ? usedToolNames : undefined,
      chatId: chatId ?? undefined,
    } satisfies AgentExecutionNotifyParams);

    // Slack通知結果をパーツに追加してメッセージを更新
    const slackNotificationPart = buildSlackNotificationPart(slackResult);
    if (slackNotificationPart && chatId) {
      // Slack通知結果をメッセージに追加（最後のアシスタントメッセージを更新）
      // DB更新は非同期で行い、エラー時はログのみ
      void (async () => {
        try {
          const { db } = await import("@tumiki/db/server");
          // 最後のアシスタントメッセージを取得
          const lastMessage = await db.message.findFirst({
            where: {
              chatId,
              role: "assistant",
            },
            orderBy: { createdAt: "desc" },
          });
          if (lastMessage && Array.isArray(lastMessage.parts)) {
            // JSON互換に変換してPrismaに渡す
            const updatedParts = JSON.parse(
              JSON.stringify([...lastMessage.parts, slackNotificationPart]),
            ) as object[];
            await db.message.update({
              where: { id: lastMessage.id },
              data: { parts: updatedParts },
            });
          }
        } catch (updateError) {
          logError(
            "Failed to update message with Slack notification result",
            toError(updateError),
            { chatId },
          );
        }
      })();
    }

    return {
      executionId,
      success: true,
      output: text,
      durationMs,
      chatId: chatId ?? undefined,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const err = toError(error);
    const errorMessage = getErrorMessage(err);

    logError("Agent execution failed", err, {
      executionId,
      agentId: request.agentId,
      durationMs,
      isTimeout: isAbortError(error),
    });

    // Slack通知を先に送信して結果を取得
    let slackNotificationPart: MessagePart | null = null;
    if (agentInfo) {
      const slackResult = await notifyAgentExecution({
        agentId: request.agentId,
        agentName: agentInfo.name,
        organizationId: agentInfo.organizationId,
        success: false,
        durationMs,
        errorMessage,
      } satisfies AgentExecutionNotifyParams);
      slackNotificationPart = buildSlackNotificationPart(slackResult);
    }

    // pendingログがある場合は更新（事前に取得したエージェント情報を再利用）
    if (pendingLogId) {
      if (effectiveUserId && agentInfo) {
        // Slack通知結果をアシスタントメッセージに含める
        const errorParts: MessagePart[] = [
          { type: "text", text: `エラーが発生しました: ${errorMessage}` },
        ];
        if (slackNotificationPart) {
          errorParts.push(slackNotificationPart);
        }

        await updateExecutionLogWithChat({
          executionLogId: pendingLogId,
          organizationId: agentInfo.organizationId,
          userId: effectiveUserId,
          agentId: request.agentId,
          agentName: agentInfo.name,
          modelId,
          success: false,
          durationMs,
          userMessage,
          assistantParts: errorParts,
        });
      } else {
        await updateExecutionLogSimple({
          executionLogId: pendingLogId,
          success: false,
          durationMs,
        });
      }
    }

    return {
      executionId,
      success: false,
      output: "",
      durationMs,
      error: errorMessage,
    };
  }
};

/**
 * 後方互換性のためのエイリアス
 * @deprecated executeAgentCommand を使用してください
 */
export const executeAgent = executeAgentCommand;
