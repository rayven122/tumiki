import { describe, test, expect, vi, afterEach } from "vitest";
import { format } from "date-fns";
import { aggregateCostTrendData } from "../aggregateCostTrendData";

const createLog = (
  createdAt: Date,
  inputTokens: number | null,
  outputTokens: number | null,
) => ({
  createdAt,
  inputTokens,
  outputTokens,
});

describe("aggregateCostTrendData", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("ログがない場合は全データポイントがゼロ", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const result = aggregateCostTrendData([], "7d");

    expect(result.totalCost).toBe(0);
    expect(result.totalInputTokens).toBe(0);
    expect(result.totalOutputTokens).toBe(0);
    // 全データポイントのcostが0
    for (const point of result.data) {
      expect(point.cost).toBe(0);
      expect(point.inputTokens).toBe(0);
      expect(point.outputTokens).toBe(0);
    }
  });

  test("単一のログでコストが正しく計算される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const logs = [
      // 1000 input = $0.01, 1000 output = $0.03 => $0.04
      createLog(new Date("2024-01-08T10:00:00Z"), 1000, 1000),
    ];

    const result = aggregateCostTrendData(logs, "24h");

    expect(result.totalCost).toBe(0.04);
    expect(result.totalInputTokens).toBe(1000);
    expect(result.totalOutputTokens).toBe(1000);
  });

  test("複数のログが同じタイムスロットに集計される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    // 同じ時間帯の2つのログ
    const logTime1 = new Date("2024-01-08T10:15:00Z");
    const logTime2 = new Date("2024-01-08T10:45:00Z");
    const logs = [createLog(logTime1, 500, 500), createLog(logTime2, 500, 500)];

    const result = aggregateCostTrendData(logs, "24h");

    // ローカルタイムゾーンでのラベルを計算
    const expectedLabel = format(logTime1, "HH");
    const slot = result.data.find((d) => d.label === expectedLabel);
    expect(slot).toBeDefined();
    expect(slot!.inputTokens).toBe(1000);
    expect(slot!.outputTokens).toBe(1000);
    // 1000 input = $0.01, 1000 output = $0.03 => $0.04
    expect(slot!.cost).toBe(0.04);
  });

  test("nullトークンは0として扱われる", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const logs = [
      createLog(new Date("2024-01-05T10:00:00Z"), null, null),
      createLog(new Date("2024-01-05T11:00:00Z"), 1000, null),
      createLog(new Date("2024-01-05T12:00:00Z"), null, 1000),
    ];

    const result = aggregateCostTrendData(logs, "7d");

    expect(result.totalInputTokens).toBe(1000);
    expect(result.totalOutputTokens).toBe(1000);
    expect(result.totalCost).toBe(0.04);
  });

  test("24hの場合は時間単位で集計される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const result = aggregateCostTrendData([], "24h");

    // 時間ラベル（"00"〜"23"形式）が含まれる
    const labels = result.data.map((d) => d.label);
    expect(labels.some((l) => /^\d{2}$/.test(l))).toBe(true);
  });

  test("7dの場合は日単位で集計される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const result = aggregateCostTrendData([], "7d");

    // 日付ラベル（"M/d"形式）が含まれる
    const labels = result.data.map((d) => d.label);
    expect(labels.some((l) => /^\d{1,2}\/\d{1,2}$/.test(l))).toBe(true);
  });

  test("30dの場合は日単位で集計される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-31T12:00:00Z"));

    const result = aggregateCostTrendData([], "30d");

    // 31日分（1/1〜1/31）
    const labels = result.data.map((d) => d.label);
    expect(labels.some((l) => /^\d{1,2}\/\d{1,2}$/.test(l))).toBe(true);
    expect(result.data.length).toBe(31);
  });

  test("totalCost/totalInputTokens/totalOutputTokensが正しく計算される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const logs = [
      createLog(new Date("2024-01-05T10:00:00Z"), 2000, 1000),
      createLog(new Date("2024-01-06T10:00:00Z"), 3000, 2000),
      createLog(new Date("2024-01-07T10:00:00Z"), 5000, 3000),
    ];

    const result = aggregateCostTrendData(logs, "7d");

    expect(result.totalInputTokens).toBe(10000);
    expect(result.totalOutputTokens).toBe(6000);
    // 10000 input = $0.10, 6000 output = $0.18 => $0.28
    expect(result.totalCost).toBe(0.28);
  });

  test("期間外のログは無視される", () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-08T12:00:00Z"));

    const logs = [
      // 7d前より前のログ
      createLog(new Date("2023-12-01T10:00:00Z"), 10000, 10000),
      // 期間内のログ
      createLog(new Date("2024-01-07T10:00:00Z"), 1000, 1000),
    ];

    const result = aggregateCostTrendData(logs, "7d");

    // 期間外のログは無視されるので、期間内のログのみ集計
    expect(result.totalInputTokens).toBe(1000);
    expect(result.totalOutputTokens).toBe(1000);
    expect(result.totalCost).toBe(0.04);
  });
});
