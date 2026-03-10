import { describe, test, expect } from "vitest";
import { aggregateAgentPerformance } from "../aggregateAgentPerformance";

const createAgent = (
  id: string,
  name: string,
  slug: string,
  iconPath: string | null = null,
) => ({
  id,
  name,
  slug,
  iconPath,
});

const createLog = (
  agentId: string,
  success: boolean | null,
  durationMs: number | null,
  createdAt: Date,
) => ({
  agentId,
  success,
  durationMs,
  createdAt,
});

describe("aggregateAgentPerformance", () => {
  test("実行履歴のないエージェントは全メトリクスがnull/ゼロ", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const result = aggregateAgentPerformance(agents, []);

    expect(result).toStrictEqual([
      {
        agentId: "a1",
        agentName: "Agent1",
        agentSlug: "agent-1",
        agentIconPath: null,
        totalExecutions: 0,
        successCount: 0,
        errorCount: 0,
        successRate: null,
        avgDurationMs: null,
        lastExecutionAt: null,
        lastExecutionSuccess: null,
      },
    ]);
  });

  test("成功率を正しく計算する", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", true, 200, new Date("2024-01-01T02:00:00Z")),
      createLog("a1", false, 300, new Date("2024-01-01T03:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    expect(result[0]?.totalExecutions).toBe(3);
    expect(result[0]?.successCount).toBe(2);
    expect(result[0]?.errorCount).toBe(1);
    // 2/3 = 66.66...% → 66.7
    expect(result[0]?.successRate).toBe(66.7);
  });

  test("平均実行時間を正しく計算する（durationMs=nullは除外）", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", true, null, new Date("2024-01-01T02:00:00Z")),
      createLog("a1", true, 300, new Date("2024-01-01T03:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    // (100 + 300) / 2 = 200
    expect(result[0]?.avgDurationMs).toBe(200);
  });

  test("全てのdurationMsがnullの場合はavgDurationMsがnull", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const logs = [
      createLog("a1", true, null, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", false, null, new Date("2024-01-01T02:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    expect(result[0]?.avgDurationMs).toBeNull();
  });

  test("最終実行の情報が正しく設定される", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const lastDate = new Date("2024-01-01T03:00:00Z");
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", false, 200, lastDate),
      createLog("a1", true, 150, new Date("2024-01-01T02:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    expect(result[0]?.lastExecutionAt).toStrictEqual(lastDate);
    expect(result[0]?.lastExecutionSuccess).toBe(false);
  });

  test("複数エージェントの集計が独立して行われる", () => {
    const agents = [
      createAgent("a1", "Agent1", "agent-1", "lucide:bot"),
      createAgent("a2", "Agent2", "agent-2"),
    ];
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", true, 200, new Date("2024-01-01T02:00:00Z")),
      createLog("a2", false, 500, new Date("2024-01-01T03:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    // Agent1: 2回実行、全て成功
    expect(result[0]?.agentId).toBe("a1");
    expect(result[0]?.agentIconPath).toBe("lucide:bot");
    expect(result[0]?.totalExecutions).toBe(2);
    expect(result[0]?.successRate).toBe(100);
    expect(result[0]?.avgDurationMs).toBe(150);

    // Agent2: 1回実行、失敗
    expect(result[1]?.agentId).toBe("a2");
    expect(result[1]?.agentIconPath).toBeNull();
    expect(result[1]?.totalExecutions).toBe(1);
    expect(result[1]?.successRate).toBe(0);
    expect(result[1]?.avgDurationMs).toBe(500);
  });

  test("成功率は小数点1桁で丸められる", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    // 1/6 = 16.666...% → 16.7
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", false, 100, new Date("2024-01-01T02:00:00Z")),
      createLog("a1", false, 100, new Date("2024-01-01T03:00:00Z")),
      createLog("a1", false, 100, new Date("2024-01-01T04:00:00Z")),
      createLog("a1", false, 100, new Date("2024-01-01T05:00:00Z")),
      createLog("a1", false, 100, new Date("2024-01-01T06:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    expect(result[0]?.successRate).toBe(16.7);
  });

  test("全て成功の場合は成功率100", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("a1", true, 200, new Date("2024-01-01T02:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    expect(result[0]?.successRate).toBe(100);
  });

  test("エージェントに紐づかないログは無視される", () => {
    const agents = [createAgent("a1", "Agent1", "agent-1")];
    const logs = [
      createLog("a1", true, 100, new Date("2024-01-01T01:00:00Z")),
      createLog("unknown", true, 200, new Date("2024-01-01T02:00:00Z")),
    ];

    const result = aggregateAgentPerformance(agents, logs);

    expect(result).toHaveLength(1);
    expect(result[0]?.totalExecutions).toBe(1);
  });
});
