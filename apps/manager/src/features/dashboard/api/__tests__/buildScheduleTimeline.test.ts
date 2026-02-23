import { describe, test, expect, vi, afterEach } from "vitest";
import { buildScheduleTimeline } from "../buildScheduleTimeline";

const createSchedule = (
  id: string,
  name: string,
  cronExpression: string,
  agentName: string,
  agentSlug: string,
  timezone = "UTC",
  agentIconPath: string | null = null,
) => ({
  id,
  name,
  cronExpression,
  timezone,
  agent: {
    name: agentName,
    slug: agentSlug,
    iconPath: agentIconPath,
  },
});

describe("buildScheduleTimeline", () => {
  // 2024-01-15（月曜日）10:00 UTC に固定
  const NOW = new Date("2024-01-15T10:00:00Z");

  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(NOW);

  afterEach(() => {
    vi.useRealTimers();
  });

  test("スケジュールがない場合は空配列を返す", () => {
    const result = buildScheduleTimeline([], "today", NOW);

    expect(result).toStrictEqual([]);
  });

  test("今日の範囲内のスケジュールを正しく返す", () => {
    // 毎時0分に実行（10:00以降、今日の残り: 11:00, 12:00, ..., 23:00 の14回）
    const schedules = [
      createSchedule("s1", "毎時実行", "0 * * * *", "Agent1", "agent-1"),
    ];

    const result = buildScheduleTimeline(schedules, "today", NOW);

    // 10:00 は now と同時刻なので含まれない（next()は次の時刻を返す）
    // 11:00 から 23:00 までの13回
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toStrictEqual({
      scheduleId: "s1",
      scheduleName: "毎時実行",
      agentName: "Agent1",
      agentSlug: "agent-1",
      agentIconPath: null,
      cronExpression: "0 * * * *",
      nextRunAt: new Date("2024-01-15T11:00:00Z"),
    });

    // 全てが今日中であること
    for (const item of result) {
      expect(item.nextRunAt.getTime()).toBeGreaterThan(NOW.getTime());
      expect(item.nextRunAt.getTime()).toBeLessThanOrEqual(
        new Date("2024-01-15T23:59:59.999Z").getTime(),
      );
    }
  });

  test("週間の範囲内で複数の実行予定を返す", () => {
    // 毎日12:00に実行
    const schedules = [
      createSchedule("s1", "日次実行", "0 12 * * *", "Agent1", "agent-1"),
    ];

    const result = buildScheduleTimeline(schedules, "week", NOW);

    // 1/15 12:00, 1/16 12:00, ..., 1/21 12:00 の7回
    expect(result).toHaveLength(7);
    expect(result[0]?.nextRunAt).toStrictEqual(
      new Date("2024-01-15T12:00:00Z"),
    );
    expect(result[6]?.nextRunAt).toStrictEqual(
      new Date("2024-01-21T12:00:00Z"),
    );
  });

  test("結果は時系列ソートされている", () => {
    const schedules = [
      // 毎日13:00
      createSchedule("s1", "午後実行", "0 13 * * *", "Agent1", "agent-1"),
      // 毎日11:00
      createSchedule("s2", "午前実行", "0 11 * * *", "Agent2", "agent-2"),
    ];

    const result = buildScheduleTimeline(schedules, "week", NOW);

    // 11:00 が 13:00 より先に来ること
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]?.scheduleName).toBe("午前実行");
    expect(result[1]?.scheduleName).toBe("午後実行");

    // 全体が昇順ソートされていること
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.nextRunAt.getTime()).toBeGreaterThanOrEqual(
        result[i - 1]!.nextRunAt.getTime(),
      );
    }
  });

  test("最大20件に制限される", () => {
    // 毎時0分に実行 × 週間 = 24*7 = 168回だが20件に制限
    const schedules = [
      createSchedule("s1", "毎時実行", "0 * * * *", "Agent1", "agent-1"),
    ];

    const result = buildScheduleTimeline(schedules, "week", NOW);

    expect(result).toHaveLength(20);
  });

  test("無効なcron式のスケジュールはスキップされる", () => {
    const schedules = [
      createSchedule(
        "s1",
        "無効なスケジュール",
        "invalid-cron",
        "Agent1",
        "agent-1",
      ),
      createSchedule(
        "s2",
        "有効なスケジュール",
        "0 12 * * *",
        "Agent2",
        "agent-2",
      ),
    ];

    const result = buildScheduleTimeline(schedules, "today", NOW);

    // 無効なスケジュールはスキップされ、有効なもののみ返される
    expect(result).toHaveLength(1);
    expect(result[0]?.scheduleName).toBe("有効なスケジュール");
  });
});
