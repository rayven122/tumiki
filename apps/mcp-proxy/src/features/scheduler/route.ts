/**
 * スケジューラAPIルート
 *
 * 内部API（サービス間通信用）
 * - POST /internal/scheduler/sync - スケジュール同期
 */

import { Hono } from "hono";
import { z } from "zod";

import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { logError, logInfo } from "../../shared/logger/index.js";
import { toError } from "../../shared/errors/toError.js";
import {
  registerSchedule,
  unregisterSchedule,
  syncAllSchedules,
} from "./cronScheduler.js";

export const schedulerRoute = new Hono<HonoEnv>();

/**
 * スケジュール設定のスキーマ
 */
const scheduleConfigSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  cronExpression: z.string().min(1),
  timezone: z.string().default("Asia/Tokyo"),
  isEnabled: z.boolean().default(true),
  message: z.string().optional(),
});

/**
 * 同期リクエストのスキーマ
 */
const syncRequestSchema = z.object({
  action: z.enum(["register", "unregister", "sync_all"]),
  schedule: scheduleConfigSchema.optional(),
  scheduleId: z.string().optional(),
  schedules: z.array(scheduleConfigSchema).optional(),
});

/**
 * POST /internal/scheduler/sync
 *
 * スケジュールの登録・解除・全体同期
 */
schedulerRoute.post("/internal/scheduler/sync", async (c) => {
  try {
    const body: unknown = await c.req.json();
    const parsed = syncRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid request", details: parsed.error.issues },
        400,
      );
    }

    const { action, schedule, scheduleId, schedules } = parsed.data;

    logInfo("Scheduler sync request", { action });

    let result: { success: boolean; message: string; data?: unknown };

    switch (action) {
      case "register": {
        if (!schedule) {
          return c.json({ error: "Schedule is required for register" }, 400);
        }
        const registerSuccess = registerSchedule(schedule);
        result = {
          success: registerSuccess,
          message: registerSuccess
            ? "Schedule registered"
            : "Failed to register schedule",
        };
        break;
      }

      case "unregister": {
        if (!scheduleId) {
          return c.json(
            { error: "ScheduleId is required for unregister" },
            400,
          );
        }
        const unregisterSuccess = unregisterSchedule(scheduleId);
        result = {
          success: unregisterSuccess,
          message: "Schedule unregistered",
        };
        break;
      }

      case "sync_all": {
        if (!schedules) {
          return c.json({ error: "Schedules is required for sync_all" }, 400);
        }
        const syncResult = syncAllSchedules(schedules);
        result = {
          success: syncResult.failed === 0,
          message: `Synced ${syncResult.success} schedules, ${syncResult.failed} failed`,
          data: syncResult,
        };
        break;
      }
    }

    return c.json(result);
  } catch (error) {
    logError("Scheduler sync error", toError(error));
    return c.json({ error: "Internal server error" }, 500);
  }
});
