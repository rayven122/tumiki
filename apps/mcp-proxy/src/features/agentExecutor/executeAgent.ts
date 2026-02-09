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

const DEFAULT_AGENT_MODEL = "anthropic/claude-3-5-sonnet";
const EXECUTION_TIMEOUT_MS = 120000;

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

const createExecutionLog = async (
  agentId: string,
  scheduleId: string | null,
  modelId: string | null,
): Promise<string | null> => {
  try {
    const log = await db.agentExecutionLog.create({
      data: {
        agentId,
        scheduleId,
        modelId,
        success: null,
        durationMs: null,
      },
    });
    return log.id;
  } catch (error) {
    logError("Failed to create execution log", toError(error), {
      agentId,
      scheduleId,
    });
    return null;
  }
};

const updateExecutionLog = async (
  logId: string,
  success: boolean,
  durationMs: number,
): Promise<void> => {
  try {
    await db.agentExecutionLog.update({
      where: { id: logId },
      data: {
        success,
        durationMs,
      },
    });
  } catch (error) {
    logError("Failed to update execution log", toError(error), {
      logId,
    });
  }
};

const getScheduleId = (trigger: ExecutionTrigger): string | null =>
  trigger.type === "schedule" ? trigger.scheduleId : null;

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

  let logId: string | null = null;

  try {
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

    const systemPrompt = buildSystemPrompt(request.trigger, agent.systemPrompt);
    const modelId = agent.modelId ?? DEFAULT_AGENT_MODEL;
    const userMessage = request.message ?? "定期実行タスクを開始してください。";

    logId = await createExecutionLog(request.agentId, scheduleId, modelId);

    logInfo("Agent configuration loaded", {
      executionId,
      agentId: request.agentId,
      modelId,
      mcpServerCount: agent.mcpServers.length,
    });

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

    if (logId) {
      await updateExecutionLog(logId, true, durationMs);
    }

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

    if (logId) {
      await updateExecutionLog(logId, false, durationMs);
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
