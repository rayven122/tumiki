import cron, { type ScheduledTask } from "node-cron";
import type { AgentSchedule, ScheduleStatus } from "@tumiki/db/prisma";
import { db } from "@tumiki/db";
import { executeAgent } from "./agentExecutor";

// スケジュールIDとタスクのマップ
const scheduledTasks = new Map<string, ScheduledTask>();

/**
 * スケジュールをNode Cronに登録
 */
export const registerSchedule = async (
  schedule: Pick<
    AgentSchedule,
    "id" | "agentId" | "cronExpression" | "timezone" | "status"
  >,
): Promise<void> => {
  // 既存のタスクがあれば停止
  const existingTask = scheduledTasks.get(schedule.id);
  if (existingTask) {
    // node-cronのstop()は同期関数
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    existingTask.stop();
    scheduledTasks.delete(schedule.id);
  }

  // ACTIVEでない場合は登録しない
  if (schedule.status !== ("ACTIVE" as ScheduleStatus)) {
    return;
  }

  // Cronタスクを作成
  const task = cron.schedule(
    schedule.cronExpression,
    () => {
      console.log(`[Scheduler] Executing schedule: ${schedule.id}`);
      executeAgent({
        agentId: schedule.agentId,
        scheduleId: schedule.id,
      }).catch((error: unknown) => {
        console.error(
          `[Scheduler] Execution failed for schedule ${schedule.id}:`,
          error,
        );
      });
    },
    {
      timezone: schedule.timezone,
    },
  );

  scheduledTasks.set(schedule.id, task);
  console.log(
    `[Scheduler] Registered schedule: ${schedule.id} (${schedule.cronExpression})`,
  );
};

/**
 * スケジュールをNode Cronから解除
 */
export const unregisterSchedule = (scheduleId: string): void => {
  const task = scheduledTasks.get(scheduleId);
  if (task) {
    // node-cronのstop()は同期関数
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    task.stop();
    scheduledTasks.delete(scheduleId);
    console.log(`[Scheduler] Unregistered schedule: ${scheduleId}`);
  }
};

/**
 * スケジュールを更新（再登録）
 * 注: registerScheduleは内部で既存タスクの解除処理を行うため、
 * unregisterScheduleの明示的な呼び出しは不要だが、意図を明確にするため残している
 */
export const updateSchedule = async (
  schedule: Pick<
    AgentSchedule,
    "id" | "agentId" | "cronExpression" | "timezone" | "status"
  >,
): Promise<void> => {
  await registerSchedule(schedule);
};

/**
 * アプリ起動時にアクティブなスケジュールを復元
 */
export const restoreSchedules = async (): Promise<void> => {
  console.log("[Scheduler] Restoring active schedules...");

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

  for (const schedule of activeSchedules) {
    await registerSchedule(schedule);
  }

  console.log(`[Scheduler] Restored ${activeSchedules.length} schedules`);
};

/**
 * 全スケジュールを停止（シャットダウン時）
 */
export const stopAllSchedules = (): void => {
  console.log("[Scheduler] Stopping all schedules...");
  for (const [id, task] of scheduledTasks) {
    // node-cronのstop()は同期関数
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    task.stop();
    console.log(`[Scheduler] Stopped: ${id}`);
  }
  scheduledTasks.clear();
};

/**
 * 登録中のスケジュール数を取得
 */
export const getActiveScheduleCount = (): number => {
  return scheduledTasks.size;
};
