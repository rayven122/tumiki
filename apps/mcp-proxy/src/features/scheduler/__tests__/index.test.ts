/**
 * スケジューラ初期化・シャットダウンテスト
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// DBモック用の関数（vi.hoistedで巻き上げ対応）
const { mockFindMany, mockSyncAllSchedules, mockStopAllTasks } = vi.hoisted(
  () => ({
    mockFindMany: vi.fn(),
    mockSyncAllSchedules: vi.fn(),
    mockStopAllTasks: vi.fn(),
  }),
);

// @tumiki/db/serverモジュールをモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    agentSchedule: {
      findMany: mockFindMany,
    },
  },
}));

// cronSchedulerをモック
vi.mock("../cronScheduler.js", () => ({
  syncAllSchedules: mockSyncAllSchedules,
  stopAllTasks: mockStopAllTasks,
  getActiveScheduleCount: vi.fn(() => 0),
}));

describe("initializeScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("DBからアクティブなスケジュールを読み込んで登録する", async () => {
    const { initializeScheduler } = await import("../index.js");

    mockFindMany.mockResolvedValueOnce([
      {
        id: "schedule-1",
        agentId: "agent-1",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        status: "ACTIVE",
      },
      {
        id: "schedule-2",
        agentId: "agent-2",
        cronExpression: "0 18 * * *",
        timezone: "UTC",
        status: "ACTIVE",
      },
    ]);

    mockSyncAllSchedules.mockReturnValueOnce({ success: 2, failed: 0 });

    await initializeScheduler();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        agentId: true,
        cronExpression: true,
        timezone: true,
        status: true,
      },
    });

    expect(mockSyncAllSchedules).toHaveBeenCalledWith([
      {
        id: "schedule-1",
        agentId: "agent-1",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
        message: undefined,
      },
      {
        id: "schedule-2",
        agentId: "agent-2",
        cronExpression: "0 18 * * *",
        timezone: "UTC",
        isEnabled: true,
        message: undefined,
      },
    ]);
  });

  test("スケジュールがない場合は空配列で同期する", async () => {
    const { initializeScheduler } = await import("../index.js");

    mockFindMany.mockResolvedValueOnce([]);
    mockSyncAllSchedules.mockReturnValueOnce({ success: 0, failed: 0 });

    await initializeScheduler();

    expect(mockSyncAllSchedules).toHaveBeenCalledWith([]);
  });

  test("DBエラーが発生しても処理を継続する", async () => {
    const { initializeScheduler } = await import("../index.js");

    mockFindMany.mockRejectedValueOnce(new Error("DB Connection Error"));

    // エラーがスローされないことを確認
    await expect(initializeScheduler()).resolves.not.toThrow();
  });
});

describe("shutdownScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("全タスクを停止する", async () => {
    const { shutdownScheduler } = await import("../index.js");

    shutdownScheduler();

    expect(mockStopAllTasks).toHaveBeenCalled();
  });
});
