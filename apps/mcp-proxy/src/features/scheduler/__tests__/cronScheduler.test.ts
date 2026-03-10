/**
 * cronScheduler テスト
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ScheduleConfig } from "../../agentExecutor/types.js";
import {
  registerSchedule,
  unregisterSchedule,
  syncAllSchedules,
  stopAllTasks,
  getScheduleConfig,
  getActiveScheduleCount,
  getAllScheduleConfigs,
} from "../cronScheduler.js";

// node-cronをモック
vi.mock("node-cron", () => {
  const mockScheduledTasks = new Map<
    string,
    { stop: () => void; destroy: () => void }
  >();

  return {
    schedule: vi.fn(
      (_expression: string, _fn: () => void, options?: { name?: string }) => {
        const taskId = options?.name ?? `task-${Date.now()}`;
        const mockTask = {
          stop: vi.fn(() => Promise.resolve()),
          // destroy()はstop()を内部で呼び出し、タスクを完全に破棄する
          destroy: vi.fn(() => Promise.resolve()),
        };
        mockScheduledTasks.set(taskId, mockTask);
        return mockTask;
      },
    ),
    validate: vi.fn((expression: string) => {
      // 有効なcron式のパターンをチェック
      const parts = expression.split(" ");
      return parts.length === 5 || parts.length === 6;
    }),
  };
});

// executeAgentをモック
vi.mock("../../agentExecutor/executeAgent.js", () => ({
  executeAgent: vi.fn(() =>
    Promise.resolve({
      executionId: "test-execution-id",
      success: true,
      output: "test output",
      durationMs: 100,
    }),
  ),
}));

describe("cronScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 各テスト前にスケジュールをクリア
    stopAllTasks();
  });

  afterEach(() => {
    stopAllTasks();
  });

  describe("registerSchedule", () => {
    test("有効なスケジュールを登録できる", () => {
      const config: ScheduleConfig = {
        id: "schedule-1",
        agentId: "agent-1",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
        message: "テストメッセージ",
      };

      const result = registerSchedule(config);

      expect(result).toBe(true);
      expect(getActiveScheduleCount()).toBe(1);
      expect(getScheduleConfig("schedule-1")).toEqual(config);
    });

    test("無効なスケジュールは設定のみ保存される", () => {
      const config: ScheduleConfig = {
        id: "schedule-2",
        agentId: "agent-2",
        cronExpression: "0 10 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: false,
      };

      const result = registerSchedule(config);

      expect(result).toBe(true);
      expect(getActiveScheduleCount()).toBe(0);
      expect(getScheduleConfig("schedule-2")).toEqual(config);
    });

    test("無効なcron式は登録に失敗する", async () => {
      // validateをモックで無効にする
      const { validate } = await import("node-cron");
      vi.mocked(validate).mockReturnValueOnce(false);

      const config: ScheduleConfig = {
        id: "schedule-3",
        agentId: "agent-3",
        cronExpression: "invalid",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      };

      const result = registerSchedule(config);

      expect(result).toBe(false);
    });

    test("既存のスケジュールを上書き登録できる", () => {
      const config1: ScheduleConfig = {
        id: "schedule-4",
        agentId: "agent-4",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      };

      const config2: ScheduleConfig = {
        id: "schedule-4",
        agentId: "agent-4-updated",
        cronExpression: "0 10 * * *",
        timezone: "UTC",
        isEnabled: true,
      };

      registerSchedule(config1);
      registerSchedule(config2);

      expect(getActiveScheduleCount()).toBe(1);
      expect(getScheduleConfig("schedule-4")?.agentId).toBe("agent-4-updated");
    });
  });

  describe("unregisterSchedule", () => {
    test("登録済みのスケジュールを解除できる", () => {
      const config: ScheduleConfig = {
        id: "schedule-5",
        agentId: "agent-5",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      };

      registerSchedule(config);
      expect(getActiveScheduleCount()).toBe(1);

      const result = unregisterSchedule("schedule-5");

      expect(result).toBe(true);
      expect(getActiveScheduleCount()).toBe(0);
      expect(getScheduleConfig("schedule-5")).toBeUndefined();
    });

    test("存在しないスケジュールの解除もtrueを返す", () => {
      const result = unregisterSchedule("non-existent");

      expect(result).toBe(true);
    });
  });

  describe("syncAllSchedules", () => {
    test("複数のスケジュールを一括同期できる", () => {
      const schedules: ScheduleConfig[] = [
        {
          id: "sync-1",
          agentId: "agent-1",
          cronExpression: "0 9 * * *",
          timezone: "Asia/Tokyo",
          isEnabled: true,
        },
        {
          id: "sync-2",
          agentId: "agent-2",
          cronExpression: "0 10 * * *",
          timezone: "Asia/Tokyo",
          isEnabled: true,
        },
        {
          id: "sync-3",
          agentId: "agent-3",
          cronExpression: "0 11 * * *",
          timezone: "Asia/Tokyo",
          isEnabled: false,
        },
      ];

      const result = syncAllSchedules(schedules);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(getActiveScheduleCount()).toBe(2); // isEnabled=trueのみ
      expect(getAllScheduleConfigs()).toHaveLength(3);
    });

    test("既存のスケジュールを全て置き換える", () => {
      // 既存のスケジュールを登録
      registerSchedule({
        id: "old-1",
        agentId: "old-agent",
        cronExpression: "0 8 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      });

      expect(getActiveScheduleCount()).toBe(1);

      // 新しいスケジュールで同期
      syncAllSchedules([
        {
          id: "new-1",
          agentId: "new-agent",
          cronExpression: "0 9 * * *",
          timezone: "Asia/Tokyo",
          isEnabled: true,
        },
      ]);

      expect(getActiveScheduleCount()).toBe(1);
      expect(getScheduleConfig("old-1")).toBeUndefined();
      expect(getScheduleConfig("new-1")).toBeDefined();
    });
  });

  describe("stopAllTasks", () => {
    test("全てのタスクを停止できる", () => {
      registerSchedule({
        id: "stop-1",
        agentId: "agent-1",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      });
      registerSchedule({
        id: "stop-2",
        agentId: "agent-2",
        cronExpression: "0 10 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      });

      expect(getActiveScheduleCount()).toBe(2);

      stopAllTasks();

      expect(getActiveScheduleCount()).toBe(0);
      expect(getAllScheduleConfigs()).toHaveLength(0);
    });
  });

  describe("getAllScheduleConfigs", () => {
    test("全てのスケジュール設定を取得できる", () => {
      const configs: ScheduleConfig[] = [
        {
          id: "get-1",
          agentId: "agent-1",
          cronExpression: "0 9 * * *",
          timezone: "Asia/Tokyo",
          isEnabled: true,
        },
        {
          id: "get-2",
          agentId: "agent-2",
          cronExpression: "0 10 * * *",
          timezone: "UTC",
          isEnabled: false,
        },
      ];

      configs.forEach((config) => registerSchedule(config));

      const allConfigs = getAllScheduleConfigs();

      expect(allConfigs).toHaveLength(2);
      expect(allConfigs).toContainEqual(configs[0]);
      expect(allConfigs).toContainEqual(configs[1]);
    });
  });
});
