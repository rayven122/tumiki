import { calculateTokenCostByModel } from "./tokenPricing";

// MCPサーバーごとのトークン集計
type McpServerTokenSummary = {
  mcpServerId: string;
  inputTokens: number;
  outputTokens: number;
};

// エージェント情報（MCPサーバーIDのリスト付き）
type AgentInput = {
  id: string;
  name: string;
  slug: string;
  iconPath: string | null;
  mcpServerIds: string[];
  modelId: string | null;
};

// エージェント別コストアイテム
type AgentCostItem = {
  agentId: string;
  agentName: string;
  agentSlug: string;
  agentIconPath: string | null;
  estimatedCost: number;
  inputTokens: number;
  outputTokens: number;
  mcpServerCount: number;
};

// エージェント別コスト内訳の集計結果
type AgentCostBreakdownResult = {
  agents: AgentCostItem[];
  totalCost: number;
};

/**
 * エージェント別コスト内訳を集計
 *
 * 各MCPサーバーのトークンを紐づくエージェント数で均等割りし、
 * コスト降順でソートして返す。
 */
export const aggregateAgentCostBreakdown = (
  agents: AgentInput[],
  mcpServerTokens: McpServerTokenSummary[],
): AgentCostBreakdownResult => {
  // MCPサーバーIDごとに紐づくエージェント数をカウント
  const mcpServerAgentCounts = new Map<string, number>();
  for (const agent of agents) {
    for (const mcpServerId of agent.mcpServerIds) {
      mcpServerAgentCounts.set(
        mcpServerId,
        (mcpServerAgentCounts.get(mcpServerId) ?? 0) + 1,
      );
    }
  }

  // エージェントごとにトークンを集計
  const agentTotals = new Map<
    string,
    { inputTokens: number; outputTokens: number }
  >();
  for (const agent of agents) {
    agentTotals.set(agent.id, { inputTokens: 0, outputTokens: 0 });
  }

  for (const summary of mcpServerTokens) {
    const agentCount = mcpServerAgentCounts.get(summary.mcpServerId) ?? 0;
    if (agentCount === 0) continue; // このMCPサーバーに紐づくエージェントがない

    const dividedInput = summary.inputTokens / agentCount;
    const dividedOutput = summary.outputTokens / agentCount;

    for (const agent of agents) {
      if (!agent.mcpServerIds.includes(summary.mcpServerId)) continue;
      const totals = agentTotals.get(agent.id)!;
      totals.inputTokens += dividedInput;
      totals.outputTokens += dividedOutput;
    }
  }

  // 結果を構築してコスト降順ソート
  const results: AgentCostItem[] = agents.map((agent) => {
    const totals = agentTotals.get(agent.id)!;
    const inputTokens = Math.round(totals.inputTokens);
    const outputTokens = Math.round(totals.outputTokens);
    return {
      agentId: agent.id,
      agentName: agent.name,
      agentSlug: agent.slug,
      agentIconPath: agent.iconPath,
      estimatedCost: calculateTokenCostByModel(agent.modelId, inputTokens, outputTokens),
      inputTokens,
      outputTokens,
      mcpServerCount: agent.mcpServerIds.length,
    };
  });

  results.sort((a, b) => b.estimatedCost - a.estimatedCost);

  const totalCost = results.reduce((sum, a) => sum + a.estimatedCost, 0);
  const roundedTotalCost = Math.round(totalCost * 100) / 100;

  return { agents: results, totalCost: roundedTotalCost };
};
