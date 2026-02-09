/**
 * エージェント実行機能
 *
 * LLMを使用してエージェントを実行し、MCPツールを呼び出す
 */

import { generateText } from "ai";
import { randomUUID } from "crypto";

import { db } from "@tumiki/db/server";

import { gateway } from "../../infrastructure/ai/index.js";
import { toError } from "../../shared/errors/toError.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import type {
  ExecuteAgentRequest,
  ExecuteAgentResult,
  ExecutionTrigger,
} from "./types.js";

/** エージェント実行用のデフォルトモデル */
const DEFAULT_AGENT_MODEL = "anthropic/claude-3-5-sonnet";

/** 実行タイムアウト（ミリ秒） */
const EXECUTION_TIMEOUT_MS = 120000; // 2分

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

/**
 * システムプロンプトを生成
 * エージェントのカスタムシステムプロンプトがある場合はそれを使用
 */
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

/**
 * 実行ログをDBに保存
 */
const saveExecutionLog = async (
  agentId: string,
  scheduleId: string | null,
  success: boolean,
  durationMs: number,
): Promise<void> => {
  try {
    await db.agentExecutionLog.create({
      data: {
        agentId,
        scheduleId,
        success,
        durationMs,
      },
    });
  } catch (error) {
    // ログ保存失敗は致命的エラーではないため、警告ログのみ
    logError("Failed to save execution log", toError(error), {
      agentId,
      scheduleId,
    });
  }
};

/**
 * トリガーからスケジュールIDを取得
 */
const getScheduleId = (trigger: ExecutionTrigger): string | null =>
  trigger.type === "schedule" ? trigger.scheduleId : null;

/**
 * エージェントを実行
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

  logInfo("Starting agent execution", {
    executionId,
    agentId: request.agentId,
    triggerType: request.trigger.type,
  });

  try {
    // DBからエージェント情報を取得
    const agent = await db.agent.findUnique({
      where: { id: request.agentId },
      select: {
        id: true,
        systemPrompt: true,
        modelId: true,
        mcpServers: { select: { id: true } },
      },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    // システムプロンプトとモデルを決定
    const systemPrompt = buildSystemPrompt(request.trigger, agent.systemPrompt);
    const modelId = agent.modelId ?? DEFAULT_AGENT_MODEL;
    const userMessage = request.message ?? "定期実行タスクを開始してください。";

    logInfo("Agent configuration loaded", {
      executionId,
      agentId: request.agentId,
      modelId,
      mcpServerCount: agent.mcpServers.length,
    });

    // タイムアウト付きでLLM呼び出し
    const { text } = await Promise.race([
      generateText({
        model: gateway(modelId),
        system: systemPrompt,
        prompt: userMessage,
        // TODO: MCPツール統合（将来対応）
        // tools: await getMcpTools(agent.mcpServers),
        // maxSteps: 10,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timeout")),
          EXECUTION_TIMEOUT_MS,
        ),
      ),
    ]);

    const durationMs = Date.now() - startTime;

    logInfo("Agent execution completed", {
      executionId,
      agentId: request.agentId,
      durationMs,
      outputLength: text.length,
    });

    await saveExecutionLog(request.agentId, scheduleId, true, durationMs);

    return {
      executionId,
      success: true,
      output: text,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const err = toError(error);

    logError("Agent execution failed", err, {
      executionId,
      agentId: request.agentId,
      durationMs,
    });

    await saveExecutionLog(request.agentId, scheduleId, false, durationMs);

    return {
      executionId,
      success: false,
      output: "",
      durationMs,
      error: err.message,
    };
  }
};
