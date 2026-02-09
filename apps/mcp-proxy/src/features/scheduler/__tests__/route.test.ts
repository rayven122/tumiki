/**
 * scheduler route テスト
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { Hono } from "hono";

import { schedulerRoute } from "../route.js";
import * as cronSchedulerModule from "../cronScheduler.js";

// cronSchedulerモジュールをモック
vi.mock("../cronScheduler.js", () => ({
  registerSchedule: vi.fn(() => true),
  unregisterSchedule: vi.fn(() => true),
  syncAllSchedules: vi.fn(() => ({ success: 1, failed: 0 })),
}));

describe("scheduler route", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/", schedulerRoute);
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
});
