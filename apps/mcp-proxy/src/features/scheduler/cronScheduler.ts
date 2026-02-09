/**
 * Cronスケジューラ
 *
 * node-cronを使用してスケジュールされたエージェント実行を管理
 */

import { schedule, validate, type ScheduledTask } from "node-cron";

import { executeAgent } from "../agentExecutor/index.js";
import type { ScheduleConfig } from "../agentExecutor/types.js";
import { logError, logInfo, logWarn } from "../../shared/logger/index.js";
import { toError } from "../../shared/errors/toError.js";

/** アクティブなcronタスクのマップ（scheduleId -> ScheduledTask） */
const activeTasks = new Map<string, ScheduledTask>();

/** 登録済みスケジュール設定のマップ（scheduleId -> ScheduleConfig） */
const scheduleConfigs = new Map<string, ScheduleConfig>();

/**
 * スケジュールを登録
 *
 * @param config - スケジュール設定
 * @returns 登録成功フラグ
 */
export const registerSchedule = (config: ScheduleConfig): boolean => {
  const { id, cronExpression, timezone, isEnabled, agentId, message } = config;

  // 既存タスクがあれば停止
  if (activeTasks.has(id)) {
    unregisterSchedule(id);
  }

  // cron式のバリデーション
  if (!validate(cronExpression)) {
    logError(
      "Invalid cron expression",
      new Error(`Invalid cron: ${cronExpression}`),
      { scheduleId: id, cronExpression },
    );
    return false;
  }

  // 無効なスケジュールは設定のみ保存
  if (!isEnabled) {
    scheduleConfigs.set(id, config);
    logInfo("Schedule registered (disabled)", { scheduleId: id });
    return true;
  }

  try {
    const task = schedule(
      cronExpression,
      async () => {
        logInfo("Scheduled task triggered", {
          scheduleId: id,
          agentId,
        });

        try {
          const result = await executeAgent({
            agentId,
            trigger: { type: "schedule", scheduleId: id },
            message: message ?? null,
          });

          if (result.success) {
            logInfo("Scheduled execution completed", {
              scheduleId: id,
              executionId: result.executionId,
              durationMs: result.durationMs,
            });
          } else {
            logWarn("Scheduled execution failed", {
              scheduleId: id,
              executionId: result.executionId,
              error: result.error,
            });
          }
        } catch (error) {
          logError("Scheduled execution error", toError(error), {
            scheduleId: id,
            agentId,
          });
        }
      },
      {
        timezone,
        name: id,
      },
    );

    activeTasks.set(id, task);
    scheduleConfigs.set(id, config);

    logInfo("Schedule registered and started", {
      scheduleId: id,
      cronExpression,
      timezone,
      agentId,
    });

    return true;
  } catch (error) {
    logError("Failed to register schedule", toError(error), {
      scheduleId: id,
      cronExpression,
    });
    return false;
  }
};

/**
 * スケジュールを解除
 *
 * @param scheduleId - スケジュールID
 * @returns 解除成功フラグ
 */
export const unregisterSchedule = (scheduleId: string): boolean => {
  const task = activeTasks.get(scheduleId);

  if (task) {
    void task.stop();
    activeTasks.delete(scheduleId);
    logInfo("Schedule unregistered", { scheduleId });
  }

  scheduleConfigs.delete(scheduleId);
  return true;
};

/**
 * 全スケジュールを同期
 *
 * 既存のタスクを全て停止し、新しい設定で再登録
 *
 * @param schedules - スケジュール設定の配列
 * @returns 同期結果（成功/失敗数）
 */
export const syncAllSchedules = (
  schedules: ScheduleConfig[],
): { success: number; failed: number } => {
  logInfo("Syncing all schedules", { count: schedules.length });

  // 既存タスクを全て停止
  stopAllTasks();

  // 新しいスケジュールを登録
  let success = 0;
  let failed = 0;

  for (const schedule of schedules) {
    if (registerSchedule(schedule)) {
      success++;
    } else {
      failed++;
    }
  }

  logInfo("Schedule sync completed", { success, failed });
  return { success, failed };
};

/**
 * 全タスクを停止
 */
export const stopAllTasks = (): void => {
  const count = activeTasks.size;

  for (const [id, task] of activeTasks) {
    void task.stop();
    logInfo("Stopped task", { scheduleId: id });
  }

  activeTasks.clear();
  scheduleConfigs.clear();

  logInfo("All tasks stopped", { count });
};

/**
 * スケジュール設定を取得
 *
 * @param scheduleId - スケジュールID
 * @returns スケジュール設定（存在しない場合はundefined）
 */
export const getScheduleConfig = (
  scheduleId: string,
): ScheduleConfig | undefined => {
  return scheduleConfigs.get(scheduleId);
};

/**
 * アクティブなスケジュール数を取得
 */
export const getActiveScheduleCount = (): number => {
  return activeTasks.size;
};

/**
 * 全スケジュール設定を取得
 */
export const getAllScheduleConfigs = (): ScheduleConfig[] => {
  return Array.from(scheduleConfigs.values());
};
