/**
 * スケジューラ機能のエントリーポイント
 */

import { db } from "@tumiki/db/server";

import { logInfo, logError } from "../../shared/logger/index.js";
import { toError } from "../../shared/errors/toError.js";
import type { ScheduleConfig } from "../agentExecutor/types.js";
import { stopAllTasks, syncAllSchedules } from "./cronScheduler.js";

export { schedulerRoute } from "./route.js";
export {
  registerSchedule,
  unregisterSchedule,
  syncAllSchedules,
  stopAllTasks,
  getScheduleConfig,
  getActiveScheduleCount,
  getAllScheduleConfigs,
} from "./cronScheduler.js";

/**
 * スケジューラを初期化
 *
 * サーバー起動時に呼び出される。
 * DBからアクティブなスケジュールを読み込み、cronジョブとして登録する。
 */
export const initializeScheduler = async (): Promise<void> => {
  logInfo("Initializing scheduler...");

  try {
    // DBからアクティブなスケジュールを読み込み
    const activeSchedules = await db.agentSchedule.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        agentId: true,
        cronExpression: true,
        timezone: true,
        status: true,
      },
    });

    // ScheduleConfig形式に変換
    const scheduleConfigs: ScheduleConfig[] = activeSchedules.map((s) => ({
      id: s.id,
      agentId: s.agentId,
      cronExpression: s.cronExpression,
      timezone: s.timezone,
      isEnabled: s.status === "ACTIVE",
      message: undefined,
    }));

    // スケジュールを登録
    const result = syncAllSchedules(scheduleConfigs);

    logInfo("Scheduler initialized", {
      total: activeSchedules.length,
      success: result.success,
      failed: result.failed,
    });
  } catch (error) {
    logError("Failed to initialize scheduler", toError(error));
    // 初期化失敗しても、サーバー自体は起動を継続
    logInfo("Scheduler initialized with no schedules due to error", {
      activeSchedules: 0,
    });
  }
};

/**
 * スケジューラをシャットダウン
 *
 * サーバー終了時に呼び出される。
 * 全ての実行中タスクを停止する。
 */
export const shutdownScheduler = (): void => {
  logInfo("Shutting down scheduler");
  stopAllTasks();
  logInfo("Scheduler shutdown complete");
};
