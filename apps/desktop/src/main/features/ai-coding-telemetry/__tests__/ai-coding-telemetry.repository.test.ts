import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (n: string) => (n === "userData" ? "/test/userData" : "/test"),
  },
}));

import * as repository from "../ai-coding-telemetry.repository";
import type { getDb } from "../../../shared/db";
import type { MetricRecord, TraceRecord } from "../ai-coding-telemetry.types";

// DbClient のモック
const mockCreateMany = vi.fn().mockResolvedValue({ count: 0 });
const mockDeleteMetricMany = vi.fn().mockResolvedValue({ count: 0 });
const mockDeleteTraceMany = vi.fn().mockResolvedValue({ count: 0 });
const mockGroupBy = vi.fn().mockResolvedValue([]);
const mockQueryRaw = vi.fn().mockResolvedValue([]);

const mockDb = {
  aiCodingMetric: {
    createMany: (...args: unknown[]) => mockCreateMany(...args),
    deleteMany: (...args: unknown[]) => mockDeleteMetricMany(...args),
    groupBy: (...args: unknown[]) => mockGroupBy(...args),
  },
  aiCodingTrace: {
    createMany: (...args: unknown[]) => mockCreateMany(...args),
    deleteMany: (...args: unknown[]) => mockDeleteTraceMany(...args),
  },
  $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
} as unknown as Awaited<ReturnType<typeof getDb>>;

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateMany.mockResolvedValue({ count: 0 });
  mockDeleteMetricMany.mockResolvedValue({ count: 0 });
  mockDeleteTraceMany.mockResolvedValue({ count: 0 });
  mockGroupBy.mockResolvedValue([]);
  mockQueryRaw.mockResolvedValue([]);
});

describe("storeMetrics", () => {
  test("空配列の場合は createMany を呼ばない", async () => {
    await repository.storeMetrics(mockDb, []);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("メトリクスを DB に保存する", async () => {
    const metrics: MetricRecord[] = [
      { tool: "claude-code", metricName: "tokens_total", value: 1000 },
      { tool: "codex", metricName: "api_calls", value: 5 },
    ];
    await repository.storeMetrics(mockDb, metrics);
    expect(mockCreateMany).toHaveBeenCalledWith({ data: metrics });
  });
});

describe("storeTraces", () => {
  test("空配列の場合は createMany を呼ばない", async () => {
    await repository.storeTraces(mockDb, []);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("トレースを DB に保存する", async () => {
    const traces: TraceRecord[] = [
      {
        tool: "claude-code",
        traceId: "abc",
        spanName: "llm.call",
        durationMs: 500,
      },
    ];
    await repository.storeTraces(mockDb, traces);
    expect(mockCreateMany).toHaveBeenCalledWith({ data: traces });
  });
});

describe("listTraces", () => {
  test("recordedAt 降順でメトリクスを取得する", async () => {
    const recordedAt = new Date("2026-01-03T00:00:00.000Z");
    mockGroupBy.mockResolvedValue([
      {
        tool: "codex",
        metricName: "codex.turn.token_usage.total_tokens",
        recordedAt,
        _sum: { value: 1234 },
        _count: { _all: 4, attributes: 3 },
      },
    ]);

    const result = await repository.listTraces(mockDb, {
      skip: 20,
      take: 10,
      toolFilter: "codex",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["recordedAt", "tool", "metricName"],
        where: {
          tool: "codex",
          recordedAt: {
            gte: new Date("2026-01-01T00:00:00"),
            lte: new Date("2026-01-31T23:59:59.999"),
          },
        },
        orderBy: [
          { recordedAt: "desc" },
          { tool: "asc" },
          { metricName: "asc" },
        ],
        skip: 20,
        take: 10,
        _sum: { value: true },
        _count: { _all: true, attributes: true },
      }),
    );
    expect(result).toStrictEqual([
      {
        id: `${recordedAt.getTime()}:codex:codex.turn.token_usage.total_tokens`,
        tool: "codex",
        metricName: "codex.turn.token_usage.total_tokens",
        value: 1234,
        startedAt: recordedAt,
        hasAttributes: true,
        sampleCount: 4,
      },
    ]);
  });
});

describe("countTraces", () => {
  test("フィルター条件に一致するメトリクス件数を返す", async () => {
    mockQueryRaw.mockResolvedValue([{ total: 8n }]);

    const result = await repository.countTraces(mockDb, {
      toolFilter: "claude-code",
    });

    expect(mockQueryRaw).toHaveBeenCalledOnce();
    expect(result).toStrictEqual(8);
  });
});

describe("getSummary", () => {
  test("since 以降のデータを groupBy で集計する", async () => {
    const since = new Date("2026-01-01");
    mockGroupBy.mockResolvedValue([
      {
        tool: "claude-code",
        metricName: "tokens_total",
        _sum: { value: 12345 },
      },
    ]);

    const result = await repository.getSummary(mockDb, since);

    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["tool", "metricName"],
        where: { recordedAt: { gte: since } },
        _sum: { value: true },
      }),
    );
    expect(result).toStrictEqual([
      { tool: "claude-code", metricName: "tokens_total", totalValue: 12345 },
    ]);
  });

  test("_sum.value が null の場合は totalValue が 0 になる", async () => {
    mockGroupBy.mockResolvedValue([
      { tool: "codex", metricName: "api_calls", _sum: { value: null } },
    ]);

    const result = await repository.getSummary(mockDb, new Date());

    expect(result.at(0)?.totalValue).toStrictEqual(0);
  });

  test("データがない場合は空配列を返す", async () => {
    mockGroupBy.mockResolvedValue([]);
    const result = await repository.getSummary(mockDb, new Date());
    expect(result).toStrictEqual([]);
  });
});

describe("getDailyUsage", () => {
  test("since 以降の日別データを $queryRaw で取得する", async () => {
    const since = new Date("2026-01-01");
    mockQueryRaw.mockResolvedValue([
      {
        date: "2026-01-01",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: 500,
      },
      {
        date: "2026-01-02",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: 300,
      },
    ]);

    const result = await repository.getDailyUsage(mockDb, since);

    expect(mockQueryRaw).toHaveBeenCalledOnce();
    const [[query]] = mockQueryRaw.mock.calls as [
      [{ strings?: string[]; values?: unknown[] }],
    ];
    expect(query.strings?.join("?")).toContain(
      `"recordedAt" / 1000, 'unixepoch', 'localtime'`,
    );
    expect(query.values).toContain(BigInt(since.getTime()));
    expect(result).toStrictEqual([
      {
        date: "2026-01-01",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: 500,
      },
      {
        date: "2026-01-02",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: 300,
      },
    ]);
  });

  test("時間別指定の場合は1時間単位で集計する", async () => {
    const since = new Date("2026-01-01");
    mockQueryRaw.mockResolvedValue([
      {
        date: "2026-01-01 09:00",
        tool: "claude-code",
        metricName: "claude_code.cost.usage",
        totalValue: 1.2,
      },
    ]);

    const result = await repository.getDailyUsage(mockDb, since, "hour");

    expect(mockQueryRaw).toHaveBeenCalledOnce();
    const [[query]] = mockQueryRaw.mock.calls as [[{ strings?: string[] }]];
    expect(query.strings?.join("?")).toContain("%Y-%m-%d %H:00");
    expect(result).toStrictEqual([
      {
        date: "2026-01-01 09:00",
        tool: "claude-code",
        metricName: "claude_code.cost.usage",
        totalValue: 1.2,
      },
    ]);
  });

  test("totalValue が BigInt の場合は Number に変換される", async () => {
    mockQueryRaw.mockResolvedValue([
      {
        date: "2026-01-01",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: BigInt(9999),
      },
    ]);

    const result = await repository.getDailyUsage(mockDb, new Date());

    expect(result.at(0)?.totalValue).toStrictEqual(9999);
    expect(typeof result.at(0)?.totalValue).toStrictEqual("number");
  });

  test("totalValue が数値化できない場合は 0 を返す", async () => {
    mockQueryRaw.mockResolvedValue([
      {
        date: "2026-01-01",
        tool: "claude-code",
        metricName: "tokens_total",
        totalValue: undefined,
      },
    ]);

    const result = await repository.getDailyUsage(mockDb, new Date());

    expect(result.at(0)?.totalValue).toStrictEqual(0);
  });

  test("データがない場合は空配列を返す", async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await repository.getDailyUsage(mockDb, new Date());
    expect(result).toStrictEqual([]);
  });
});

describe("getMemberUsage", () => {
  test("Codex token usage から概算コストを算出する SQL を使う", async () => {
    const since = new Date("2026-01-01");
    mockQueryRaw.mockResolvedValue([
      {
        member: "ユーザー情報なし",
        tool: "codex-app-server",
        inputTokens: 1000000,
        outputTokens: 100000,
        costUsd: 8,
        sessionCount: 1,
        lastSeenAt: BigInt(since.getTime()),
      },
    ]);

    const result = await repository.getMemberUsage(mockDb, since);

    expect(mockQueryRaw).toHaveBeenCalledOnce();
    const [[query]] = mockQueryRaw.mock.calls as [[unknown]];
    const sql = JSON.stringify(query);
    expect(sql).toContain("codex_token_type");
    expect(sql).toContain("costUsd");
    expect(result).toStrictEqual([
      {
        member: "ユーザー情報なし",
        tool: "codex-app-server",
        inputTokens: 1000000,
        outputTokens: 100000,
        costUsd: 8,
        sessionCount: 1,
        lastSeenAt: since.toISOString(),
      },
    ]);
  });
});

describe("deleteOldMetrics", () => {
  test("指定日時より前の recordedAt を持つレコードを削除する", async () => {
    const before = new Date("2026-01-01");
    mockDeleteMetricMany.mockResolvedValue({ count: 42 });

    const result = await repository.deleteOldMetrics(mockDb, before);

    expect(mockDeleteMetricMany).toHaveBeenCalledWith({
      where: { recordedAt: { lt: before } },
    });
    expect(result).toStrictEqual(42);
  });

  test("削除対象がない場合は 0 を返す", async () => {
    mockDeleteMetricMany.mockResolvedValue({ count: 0 });
    const result = await repository.deleteOldMetrics(mockDb, new Date());
    expect(result).toStrictEqual(0);
  });
});

describe("deleteOldTraces", () => {
  test("指定日時より前の startedAt を持つレコードを削除する", async () => {
    const before = new Date("2026-01-01");
    mockDeleteTraceMany.mockResolvedValue({ count: 7 });

    const result = await repository.deleteOldTraces(mockDb, before);

    expect(mockDeleteTraceMany).toHaveBeenCalledWith({
      where: { startedAt: { lt: before } },
    });
    expect(result).toStrictEqual(7);
  });

  test("削除対象がない場合は 0 を返す", async () => {
    mockDeleteTraceMany.mockResolvedValue({ count: 0 });
    const result = await repository.deleteOldTraces(mockDb, new Date());
    expect(result).toStrictEqual(0);
  });
});
