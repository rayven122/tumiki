/**
 * エージェント実行機能
 *
 * LLMを使用してエージェントを実行し、MCPツールを呼び出す
 * 実行結果はChat/Message形式で保存される
 */

import { streamText, type Tool } from "ai";
import { randomUUID } from "crypto";

import { db, type Prisma } from "@tumiki/db/server";

import { gateway } from "../../infrastructure/ai/index.js";
import { toError } from "../../shared/errors/toError.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import { getChatMcpTools } from "../chat/chatMcpTools.js";
import type {
  ExecuteAgentRequest,
  ExecuteAgentResult,
  ExecutionTrigger,
} from "./types.js";

/** テキストパーツ型 */
type TextPart = {
  type: "text";
  text: string;
};

/** ツール呼び出しパーツ型 */
type ToolCallPart = {
  type: string;
  toolCallId: string;
  state: "output-available";
  input: unknown;
  output: unknown;
};

/** メッセージパーツの型 */
type MessagePart = TextPart | ToolCallPart;

/** エージェント実行用のデフォルトモデル */
const DEFAULT_AGENT_MODEL = "anthropic/claude-3-5-sonnet";

/** 実行タイムアウト（ミリ秒） */
const EXECUTION_TIMEOUT_MS = 120000; // 2分

/** エージェントの最大ツール呼び出しステップ数 */
const MAX_TOOL_STEPS = 10;

/** デフォルトの実行開始メッセージ */
const DEFAULT_EXECUTION_MESSAGE = "定期実行タスクを開始してください。";

/** AI SDK streamText の結果型（必要なプロパティのみ） */
type StreamTextResult = {
  text: string;
  steps?: Array<{
    toolCalls?: Array<{
      toolCallId: string;
      toolName: string;
      input: unknown;
    }>;
    toolResults?: Array<{
      toolCallId: string;
      output: unknown;
    }>;
  }>;
};

/**
 * streamTextの結果からメッセージパーツを生成
 */
const buildMessageParts = (result: StreamTextResult): MessagePart[] => {
  const parts: MessagePart[] = [];

  // テキスト出力
  if (result.text) {
    parts.push({ type: "text", text: result.text });
  }

  // ツール呼び出し情報をpartsに追加
  for (const step of result.steps ?? []) {
    for (const toolCall of step.toolCalls ?? []) {
      const toolResult = step.toolResults?.find(
        (r) => r.toolCallId === toolCall.toolCallId,
      );
      parts.push({
        type: `tool-${toolCall.toolName}`,
        toolCallId: toolCall.toolCallId,
        state: "output-available",
        input: toolCall.input,
        output: toolResult?.output,
      });
    }
  }

  // パーツが空の場合はデフォルトのテキストを追加
  if (parts.length === 0) {
    parts.push({ type: "text", text: "" });
  }

  return parts;
};

/**
 * トリガー情報を文字列に変換
 */
const triggerToString = (trigger: ExecutionTrigger): string => {
  switch (trigger.type) {
    case "schedule":
      return `スケジュール実行 (ID: ${trigger.scheduleId})`;
    case "webhook":
      return `Webhook実行 (ID: ${trigger.webhookId})`;
    case "manual":
      return `手動実行 (ユーザー: ${trigger.userId})`;
    case "a2a":
      return `A2A実行 (ソース: ${trigger.sourceAgentId})`;
  }
};

const buildSystemPrompt = (
  trigger: ExecutionTrigger,
  customSystemPrompt?: string,
): string => {
  const triggerInfo = triggerToString(trigger);
  const executionContext = `
実行情報:
- トリガー: ${triggerInfo}
- 実行時刻: ${new Date().toISOString()}
`;

  if (customSystemPrompt) {
    return `${customSystemPrompt}\n\n${executionContext}`;
  }

  return `あなたはタスク実行エージェントです。

${executionContext}

与えられたタスクを実行し、結果を報告してください。
エラーが発生した場合は、エラー内容と対処方法を報告してください。`;
};

/** 実行ログ作成（pending状態）のパラメータ */
type CreatePendingLogParams = {
  agentId: string;
  scheduleId: string | null;
  modelId: string;
};

/** 実行ログ更新（完了時）のパラメータ（Chat/Message形式） */
type UpdateExecutionLogWithChatParams = {
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
type UpdateExecutionLogSimpleParams = {
  executionLogId: string;
  success: boolean;
  durationMs: number;
};

/** 実行ログ更新の結果 */
type UpdateExecutionLogResult = {
  chatId: string | null;
  failed: boolean;
};

/**
 * 実行開始時にpending状態のログを作成
 *
 * @returns 作成されたログのID（失敗時はnull）
 */
const createPendingExecutionLog = async (
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
const updateExecutionLogWithChat = async (
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
    const result = await db.$transaction(async (tx) => {
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

      // ユーザーメッセージを作成
      await tx.message.create({
        data: {
          chatId: chat.id,
          role: "user",
          parts: [{ type: "text", text: userMessage }] as TextPart[],
          attachments: [],
          createdAt: now,
        },
      });

      // アシスタントメッセージを作成
      await tx.message.create({
        data: {
          chatId: chat.id,
          role: "assistant",
          parts: assistantParts as unknown as Prisma.InputJsonValue[],
          attachments: [],
          createdAt: new Date(now.getTime() + durationMs),
        },
      });

      // AgentExecutionLogを更新（chatIdを紐付け、成功/失敗を記録）
      await tx.agentExecutionLog.update({
        where: { id: executionLogId },
        data: {
          chatId: chat.id,
          modelId,
          success,
          durationMs,
        },
      });

      return { chatId: chat.id };
    });

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
const updateExecutionLogSimple = async (
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

const getScheduleId = (trigger: ExecutionTrigger): string | null =>
  trigger.type === "schedule" ? trigger.scheduleId : null;

/**
 * トリガーからユーザーIDを取得
 */
const getUserId = (trigger: ExecutionTrigger): string | null =>
  trigger.type === "manual" ? trigger.userId : null;

/**
 * ストリームを消費してテキストとステップ情報を収集
 */
const consumeStream = async (
  streamResult: Awaited<ReturnType<typeof streamText>>,
): Promise<StreamTextResult> => {
  // ストリームを消費してテキストを収集
  let text = "";

  for await (const part of streamResult.fullStream) {
    if (part.type === "text-delta") {
      text += part.text;
    }
  }

  // stepsプロパティから詳細情報を取得
  const rawSteps = await streamResult.steps;
  const steps: StreamTextResult["steps"] = rawSteps.map((step) => ({
    toolCalls: step.toolCalls.map(({ toolCallId, toolName, input }) => ({
      toolCallId,
      toolName,
      // AI SDKのtool inputは動的型のためunknownとして扱う
      input: input as unknown,
    })),
    toolResults: step.toolResults.map(({ toolCallId, output }) => ({
      toolCallId,
      // AI SDKのtool outputは動的型のためunknownとして扱う
      output: output as unknown,
    })),
  }));

  return {
    text,
    steps: steps.length > 0 ? steps : undefined,
  };
};

/**
 * エージェントを実行
 *
 * 実行開始時にpending状態のログを作成し、完了時に更新する。
 * これにより「稼働中」の実行をリアルタイムで表示できる。
 *
 * @param request - 実行リクエスト
 * @returns 実行結果
 */
export const executeAgent = async (
  request: ExecuteAgentRequest,
): Promise<ExecuteAgentResult> => {
  const executionId = randomUUID();
  const startTime = Date.now();
  const scheduleId = getScheduleId(request.trigger);
  const userId = getUserId(request.trigger);

  // pending状態のログID（実行開始後に設定）
  let pendingLogId: string | null = null;

  logInfo("Starting agent execution", {
    executionId,
    agentId: request.agentId,
    triggerType: request.trigger.type,
  });

  try {
    const agent = await db.agent.findUnique({
      where: { id: request.agentId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        systemPrompt: true,
        modelId: true,
        createdById: true,
        mcpServers: { select: { id: true } },
      },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    const systemPrompt = buildSystemPrompt(request.trigger, agent.systemPrompt);
    const modelId = agent.modelId ?? DEFAULT_AGENT_MODEL;
    const userMessage = request.message ?? DEFAULT_EXECUTION_MESSAGE;
    const effectiveUserId = userId ?? agent.createdById;

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
    // 手動実行: trigger.userId を使用
    // スケジュール実行等: agent.createdById を使用
    // createdByIdがnullの場合: MCPツールなしで実行
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

    // タイムアウト付きでLLM呼び出し（streamTextを使用）
    const streamResult = streamText({
      model: gateway(modelId),
      system: systemPrompt,
      prompt: userMessage,
      ...(hasMcpTools && {
        tools: mcpTools,
        maxSteps: MAX_TOOL_STEPS,
      }),
    });

    // タイムアウト付きでストリームを消費
    const result = await Promise.race([
      consumeStream(streamResult),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timeout")),
          EXECUTION_TIMEOUT_MS,
        ),
      ),
    ]);

    // 出力テキストとメッセージパーツを生成
    const { text } = result;
    const assistantParts = buildMessageParts(result);

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
      await db.agent.update({
        where: { id: request.agentId },
        data: { estimatedDurationMs: durationMs },
      });
    } catch (updateError) {
      // 推定時間の更新失敗は致命的ではないため、警告ログのみ
      logError("Failed to update estimated duration", toError(updateError), {
        agentId: request.agentId,
        durationMs,
      });
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

    logError("Agent execution failed", err, {
      executionId,
      agentId: request.agentId,
      durationMs,
    });

    // pendingログがある場合は更新、ない場合は新規作成
    if (pendingLogId) {
      // エージェント情報を取得
      const errorAgent = await db.agent.findUnique({
        where: { id: request.agentId },
        select: {
          name: true,
          organizationId: true,
          createdById: true,
          modelId: true,
        },
      });

      const errorModelId = errorAgent?.modelId ?? DEFAULT_AGENT_MODEL;
      const errorEffectiveUserId = userId ?? errorAgent?.createdById;
      const userMessage = request.message ?? DEFAULT_EXECUTION_MESSAGE;

      if (errorEffectiveUserId && errorAgent) {
        await updateExecutionLogWithChat({
          executionLogId: pendingLogId,
          organizationId: errorAgent.organizationId,
          userId: errorEffectiveUserId,
          agentId: request.agentId,
          agentName: errorAgent.name,
          modelId: errorModelId,
          success: false,
          durationMs,
          userMessage,
          assistantParts: [
            { type: "text", text: `エラーが発生しました: ${err.message}` },
          ],
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
      error: err.message,
    };
  }
};
