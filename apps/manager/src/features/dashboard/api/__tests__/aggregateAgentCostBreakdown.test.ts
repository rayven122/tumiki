import { describe, test, expect } from "vitest";
import { aggregateAgentCostBreakdown } from "../aggregateAgentCostBreakdown";
import { calculateTokenCostByModel } from "../tokenPricing";

const createAgent = (
  id: string,
  name: string,
  slug: string,
  mcpServerIds: string[],
  iconPath: string | null = null,
  modelId: string | null = null,
) => ({
  id,
  name,
  slug,
  iconPath,
  mcpServerIds,
  modelId,
});

const createMcpTokens = (
  mcpServerId: string,
  inputTokens: number,
  outputTokens: number,
) => ({
  mcpServerId,
  inputTokens,
  outputTokens,
});

describe("aggregateAgentCostBreakdown", () => {
  test("エージェントがいない場合は空配列", () => {
    const result = aggregateAgentCostBreakdown([], []);

    expect(result).toStrictEqual({
      agents: [],
      totalCost: 0,
    });
  });

  test("単一エージェント・単一MCPサーバーのコスト計算", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1", ["mcp1"])];
    const mcpTokens = [createMcpTokens("mcp1", 1000, 2000)];

    const result = aggregateAgentCostBreakdown(agents, mcpTokens);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]).toStrictEqual({
      agentId: "a1",
      agentName: "Agent1",
      agentSlug: "agent-1",
      agentIconPath: null,
      estimatedCost: calculateTokenCostByModel(null, 1000, 2000),
      inputTokens: 1000,
      outputTokens: 2000,
      mcpServerCount: 1,
    });
    expect(result.totalCost).toBe(calculateTokenCostByModel(null, 1000, 2000));
  });

  test("共有MCPサーバーのコストが均等割りされる", () => {
    // 2つのエージェントが同じMCPサーバーを共有
    const agents = [
      createAgent("a1", "Agent1", "agent-1", ["mcp1"]),
      createAgent("a2", "Agent2", "agent-2", ["mcp1"]),
    ];
    const mcpTokens = [createMcpTokens("mcp1", 1000, 2000)];

    const result = aggregateAgentCostBreakdown(agents, mcpTokens);

    // 各エージェントに半分ずつ
    expect(result.agents[0]?.inputTokens).toBe(500);
    expect(result.agents[0]?.outputTokens).toBe(1000);
    expect(result.agents[1]?.inputTokens).toBe(500);
    expect(result.agents[1]?.outputTokens).toBe(1000);
    expect(result.agents[0]?.estimatedCost).toBe(
      calculateTokenCostByModel(null, 500, 1000),
    );
  });

  test("複数MCPサーバーのコストが合算される", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1", ["mcp1", "mcp2"])];
    const mcpTokens = [
      createMcpTokens("mcp1", 1000, 1000),
      createMcpTokens("mcp2", 2000, 3000),
    ];

    const result = aggregateAgentCostBreakdown(agents, mcpTokens);

    // 1000+2000=3000入力, 1000+3000=4000出力
    expect(result.agents[0]?.inputTokens).toBe(3000);
    expect(result.agents[0]?.outputTokens).toBe(4000);
    expect(result.agents[0]?.estimatedCost).toBe(
      calculateTokenCostByModel(null, 3000, 4000),
    );
  });

  test("コスト降順でソートされる", () => {
    const agents = [
      createAgent("a1", "LowCost", "low-cost", ["mcp1"]),
      createAgent("a2", "HighCost", "high-cost", ["mcp2"]),
    ];
    const mcpTokens = [
      createMcpTokens("mcp1", 100, 100),
      createMcpTokens("mcp2", 10000, 10000),
    ];

    const result = aggregateAgentCostBreakdown(agents, mcpTokens);

    // HighCostが先にくる
    expect(result.agents[0]?.agentId).toBe("a2");
    expect(result.agents[1]?.agentId).toBe("a1");
  });

  test("MCPサーバーに紐づくエージェントがいない場合のトークンは無視される", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1", ["mcp1"])];
    // mcp2はどのエージェントにも紐づいていない
    const mcpTokens = [
      createMcpTokens("mcp1", 1000, 1000),
      createMcpTokens("mcp2", 5000, 5000),
    ];

    const result = aggregateAgentCostBreakdown(agents, mcpTokens);

    // mcp2のトークンは無視される
    expect(result.agents[0]?.inputTokens).toBe(1000);
    expect(result.agents[0]?.outputTokens).toBe(1000);
    expect(result.totalCost).toBe(calculateTokenCostByModel(null, 1000, 1000));
  });

  test("エージェントにMCPサーバーが紐づいていない場合はコスト0", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1", [])];
    const mcpTokens = [createMcpTokens("mcp1", 1000, 1000)];

    const result = aggregateAgentCostBreakdown(agents, mcpTokens);

    expect(result.agents[0]).toStrictEqual({
      agentId: "a1",
      agentName: "Agent1",
      agentSlug: "agent-1",
      agentIconPath: null,
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      mcpServerCount: 0,
    });
    expect(result.totalCost).toBe(0);
  });

  describe("モデル別コスト計算", () => {
    test("モデルIDが指定されたエージェントはモデル別単価で計算される", () => {
      const agents = [
        createAgent(
          "a1",
          "OpusAgent",
          "opus-agent",
          ["mcp1"],
          null,
          "anthropic/claude-opus-4.5",
        ),
      ];
      const mcpTokens = [createMcpTokens("mcp1", 1000, 1000)];

      const result = aggregateAgentCostBreakdown(agents, mcpTokens);

      // Opus 4.5: input=$0.015/1K, output=$0.075/1K
      // 1000 input = $0.015, 1000 output = $0.075 => $0.09
      expect(result.agents[0]?.estimatedCost).toBe(0.09);
      expect(result.totalCost).toBe(0.09);
    });

    test("異なるモデルのエージェントでtotalCostが正しく合算される", () => {
      const agents = [
        createAgent(
          "a1",
          "OpusAgent",
          "opus-agent",
          ["mcp1"],
          null,
          "anthropic/claude-opus-4.5",
        ),
        createAgent(
          "a2",
          "MiniAgent",
          "mini-agent",
          ["mcp2"],
          null,
          "openai/gpt-4o-mini",
        ),
      ];
      const mcpTokens = [
        createMcpTokens("mcp1", 1000, 1000),
        createMcpTokens("mcp2", 1000, 1000),
      ];

      const result = aggregateAgentCostBreakdown(agents, mcpTokens);

      const opusCost = calculateTokenCostByModel(
        "anthropic/claude-opus-4.5",
        1000,
        1000,
      );
      const miniCost = calculateTokenCostByModel(
        "openai/gpt-4o-mini",
        1000,
        1000,
      );
      expect(result.totalCost).toBe(
        Math.round((opusCost + miniCost) * 100) / 100,
      );
    });

    test("modelIdがnullのエージェントはデフォルト単価で計算される", () => {
      const agents = [
        createAgent("a1", "DefaultAgent", "default-agent", ["mcp1"], null, null),
      ];
      const mcpTokens = [createMcpTokens("mcp1", 1000, 1000)];

      const result = aggregateAgentCostBreakdown(agents, mcpTokens);

      expect(result.agents[0]?.estimatedCost).toBe(
        calculateTokenCostByModel(null, 1000, 1000),
      );
    });
  });
});
