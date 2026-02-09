/**
 * scheduler route テスト
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Hono } from "hono";

import { schedulerRoute } from "../route.js";
import * as cronSchedulerModule from "../cronScheduler.js";

// cronSchedulerモジュールをモック
vi.mock("../cronScheduler.js", () => ({
  registerSchedule: vi.fn(() => true),
  unregisterSchedule: vi.fn(() => true),
  syncAllSchedules: vi.fn(() => ({ success: 1, failed: 0 })),
  getScheduleConfig: vi.fn(() => ({
    id: "schedule-1",
    agentId: "agent-1",
    cronExpression: "0 9 * * *",
    timezone: "Asia/Tokyo",
    isEnabled: true,
    message: "テストメッセージ",
  })),
  getActiveScheduleCount: vi.fn(() => 1),
  getAllScheduleConfigs: vi.fn(() => [
    {
      id: "schedule-1",
      agentId: "agent-1",
      cronExpression: "0 9 * * *",
      timezone: "Asia/Tokyo",
      isEnabled: true,
    },
  ]),
}));

// executeAgentをモック
vi.mock("../../agentExecutor/executeAgent.js", () => ({
  executeAgent: vi.fn(() =>
    Promise.resolve({
      executionId: "exec-123",
      success: true,
      output: "実行完了",
      durationMs: 100,
    }),
  ),
}));

describe("scheduler route", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/", schedulerRoute);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /internal/scheduler/sync", () => {
    test("registerアクションでスケジュールを登録する", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          schedule: {
            id: "schedule-1",
            agentId: "agent-1",
            cronExpression: "0 9 * * *",
            timezone: "Asia/Tokyo",
            isEnabled: true,
          },
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        success: boolean;
        message: string;
      };
      expect(json.success).toBe(true);
      expect(json.message).toBe("Schedule registered");
      expect(cronSchedulerModule.registerSchedule).toHaveBeenCalled();
    });

    test("unregisterアクションでスケジュールを解除する", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unregister",
          scheduleId: "schedule-1",
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        success: boolean;
        message: string;
      };
      expect(json.success).toBe(true);
      expect(json.message).toBe("Schedule unregistered");
      expect(cronSchedulerModule.unregisterSchedule).toHaveBeenCalledWith(
        "schedule-1",
      );
    });

    test("sync_allアクションで全スケジュールを同期する", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
          schedules: [
            {
              id: "schedule-1",
              agentId: "agent-1",
              cronExpression: "0 9 * * *",
              timezone: "Asia/Tokyo",
              isEnabled: true,
            },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        success: boolean;
        message: string;
      };
      expect(json.success).toBe(true);
      expect(json.message).toBe("Synced 1 schedules, 0 failed");
      expect(cronSchedulerModule.syncAllSchedules).toHaveBeenCalled();
    });

    test("registerアクションでscheduleがない場合は400エラー", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
        }),
      });

      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Schedule is required for register");
    });

    test("unregisterアクションでscheduleIdがない場合は400エラー", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unregister",
        }),
      });

      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("ScheduleId is required for unregister");
    });

    test("sync_allアクションでschedulesがない場合は400エラー", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
        }),
      });

      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Schedules is required for sync_all");
    });

    test("無効なリクエストボディは400エラー", async () => {
      const response = await app.request("/internal/scheduler/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invalid_action",
        }),
      });

      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Invalid request");
    });
  });

  describe("POST /internal/scheduler/run", () => {
    test("スケジュールを手動実行する", async () => {
      const response = await app.request("/internal/scheduler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: "schedule-1",
          userId: "user-1",
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        success: boolean;
        executionId: string;
        output: string;
      };
      expect(json.success).toBe(true);
      expect(json.executionId).toBe("exec-123");
      expect(json.output).toBe("実行完了");
    });

    test("存在しないスケジュールは404エラー", async () => {
      vi.mocked(cronSchedulerModule.getScheduleConfig).mockReturnValueOnce(
        undefined,
      );

      const response = await app.request("/internal/scheduler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: "non-existent",
          userId: "user-1",
        }),
      });

      expect(response.status).toBe(404);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Schedule not found");
    });

    test("無効なリクエストボディは400エラー", async () => {
      const response = await app.request("/internal/scheduler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // scheduleIdが空
          scheduleId: "",
          userId: "user-1",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /internal/scheduler/status", () => {
    test("スケジューラのステータスを取得する", async () => {
      const response = await app.request("/internal/scheduler/status", {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        status: string;
        activeSchedules: number;
        schedules: Array<{
          id: string;
          agentId: string;
          cronExpression: string;
          timezone: string;
          isEnabled: boolean;
        }>;
      };
      expect(json.status).toBe("running");
      expect(json.activeSchedules).toBe(1);
      expect(json.schedules).toHaveLength(1);
      expect(json.schedules[0]).toMatchObject({
        id: "schedule-1",
        agentId: "agent-1",
        cronExpression: "0 9 * * *",
        timezone: "Asia/Tokyo",
        isEnabled: true,
      });
    });
  });
});
