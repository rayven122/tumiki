import { db } from "@tumiki/db";
import { generateText } from "ai";
import { loadPersona } from "@tumiki/prompts";
import { getLanguageModel } from "@/features/chat/services/ai/providers";
import { getMcpToolsFromServers } from "@/features/chat/services/ai/tools/mcp";

type ExecuteAgentParams = {
  agentId: string;
  scheduleId: string;
};

type ExecuteAgentResult = {
  success: boolean;
  durationMs: number;
  output?: string;
  error?: string;
};

/**
 * エージェントを実行する
 */
export const executeAgent = async (
  params: ExecuteAgentParams,
): Promise<ExecuteAgentResult> => {
  const startTime = Date.now();

  try {
    // エージェント情報を取得
    const agent = await db.agent.findUnique({
      where: { id: params.agentId },
      include: {
        mcpServers: {
          select: {
            id: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${params.agentId}`);
    }

    // MCPツールを取得（MCPサーバーが設定されている場合のみ）
    const mcpServerIds = agent.mcpServers.map((s) => s.id);
    const mcpTools =
      mcpServerIds.length > 0
        ? await getMcpToolsFromServers(mcpServerIds, agent.organization.id)
        : {};

    // ペルソナとsystemPromptを結合
    const personaContent = agent.personaId
      ? loadPersona(agent.personaId).content
      : undefined;
    let systemPrompt: string | undefined;
    if (personaContent && agent.systemPrompt) {
      systemPrompt = `${personaContent}\n\n${agent.systemPrompt}`;
    } else if (personaContent) {
      systemPrompt = personaContent;
    } else {
      systemPrompt = agent.systemPrompt ?? undefined;
    }

    // LLMを呼び出し
    const model = agent.modelId
      ? getLanguageModel(agent.modelId)
      : getLanguageModel("anthropic/claude-3.5-sonnet");

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "定期実行タスクを開始してください。",
        },
      ],
      tools: mcpTools,
    });

    const durationMs = Date.now() - startTime;

    // 実行ログを保存
    await db.agentExecutionLog.create({
      data: {
        agentId: params.agentId,
        scheduleId: params.scheduleId,
        success: true,
        durationMs,
      },
    });

    return {
      success: true,
      durationMs,
      output: result.text,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // エラーログを保存
    await db.agentExecutionLog.create({
      data: {
        agentId: params.agentId,
        scheduleId: params.scheduleId,
        success: false,
        durationMs,
      },
    });

    console.error(`[AgentExecutor] Execution failed:`, error);

    return {
      success: false,
      durationMs,
      error: errorMessage,
    };
  }
};
