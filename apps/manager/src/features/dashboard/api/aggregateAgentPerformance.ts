import type { z } from "zod";
import type { AgentPerformanceItemSchema } from "./schemas";

// 集計関数の入力型
type AgentInput = {
  id: string;
  name: string;
  slug: string;
  iconPath: string | null;
};

type ExecutionLogInput = {
  agentId: string;
  success: boolean | null;
  durationMs: number | null;
  createdAt: Date;
};

type AgentPerformanceItem = z.infer<typeof AgentPerformanceItemSchema>;

/**
 * エージェント別のパフォーマンスメトリクスを集計する純粋関数
 *
 * - 実行ゼロのエージェントも結果に含める（全メトリクスnull/0）
 * - successRateは小数点1桁で丸める
 * - avgDurationMsはdurationMs=nullのログを除外して計算
 */
export const aggregateAgentPerformance = (
  agents: AgentInput[],
  executionLogs: ExecutionLogInput[],
): AgentPerformanceItem[] => {
  // agentIdごとにログをグルーピング
  const logsByAgent = new Map<string, ExecutionLogInput[]>();
  for (const log of executionLogs) {
    const existing = logsByAgent.get(log.agentId);
    if (existing) {
      existing.push(log);
    } else {
      logsByAgent.set(log.agentId, [log]);
    }
  }

  return agents.map((agent) => {
    const logs = logsByAgent.get(agent.id) ?? [];

    if (logs.length === 0) {
      return {
        agentId: agent.id,
        agentName: agent.name,
        agentSlug: agent.slug,
        agentIconPath: agent.iconPath,
        totalExecutions: 0,
        successCount: 0,
        errorCount: 0,
        successRate: null,
        avgDurationMs: null,
        lastExecutionAt: null,
        lastExecutionSuccess: null,
      };
    }

    const successCount = logs.filter((l) => l.success === true).length;
    const errorCount = logs.filter((l) => l.success === false).length;
    const successRate = Math.round((successCount / logs.length) * 1000) / 10;

    // durationMsがnullでないログのみで平均を計算
    const durationsMs = logs
      .map((l) => l.durationMs)
      .filter((d): d is number => d !== null);
    const avgDurationMs =
      durationsMs.length > 0
        ? Math.round(
            durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length,
          )
        : null;

    // 最新の実行を取得（全体ソートせず最大値のみ探索）
    const lastExecution = logs.reduce<ExecutionLogInput | null>(
      (latest, log) =>
        !latest || log.createdAt.getTime() > latest.createdAt.getTime()
          ? log
          : latest,
      null,
    );

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentSlug: agent.slug,
      agentIconPath: agent.iconPath,
      totalExecutions: logs.length,
      successCount,
      errorCount,
      successRate,
      avgDurationMs,
      lastExecutionAt: lastExecution?.createdAt ?? null,
      lastExecutionSuccess: lastExecution?.success ?? null,
    };
  });
};
