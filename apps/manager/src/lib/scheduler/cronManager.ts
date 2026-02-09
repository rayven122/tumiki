/**
 * Cronスケジュール管理
 *
 * スケジュールの登録・解除・更新を管理し、
 * mcp-proxyへの委譲を行う
 */

import type { AgentSchedule } from "@tumiki/db";

import {
  registerScheduleToProxy,
  unregisterScheduleFromProxy,
} from "./syncScheduler";

/** スケジュール設定の型（必要最小限のフィールド） */
type ScheduleInput = Pick<
  AgentSchedule,
  "id" | "agentId" | "cronExpression" | "timezone" | "status"
>;

/**
 * スケジュールをmcp-proxyに登録
 *
 * @param schedule - スケジュール設定
 */
export const registerSchedule = async (
  schedule: ScheduleInput,
): Promise<void> => {
  // ACTIVEでない場合は登録しない
  if (schedule.status !== "ACTIVE") {
    return;
  }

  await registerScheduleToProxy({
    id: schedule.id,
    agentId: schedule.agentId,
    cronExpression: schedule.cronExpression,
    timezone: schedule.timezone,
    isEnabled: true,
  });
};

/**
 * スケジュールをmcp-proxyから解除
 *
 * @param scheduleId - スケジュールID
 */
export const unregisterSchedule = (scheduleId: string): void => {
  // 非同期だがvoidで返す（呼び出し側でawaitしない場合がある）
  unregisterScheduleFromProxy(scheduleId).catch(console.error);
};

/**
 * スケジュールを更新（解除後に再登録）
 *
 * @param schedule - スケジュール設定
 */
export const updateSchedule = async (
  schedule: ScheduleInput,
): Promise<void> => {
  // 一度解除してから再登録
  await unregisterScheduleFromProxy(schedule.id);
  await registerSchedule(schedule);
};

/**
 * 全スケジュールを復元
 *
 * サーバー起動時に呼び出される。
 * mcp-proxy側で initializeScheduler が実行されるため、
 * manager側では何もしない。
 */
export const restoreSchedules = (): void => {
  // mcp-proxy側で initializeScheduler が DB から読み込むため
  // manager側では何もしない
  console.log("[Scheduler] Schedules are restored by mcp-proxy");
};

/**
 * 全スケジュールを停止
 *
 * サーバー終了時に呼び出される。
 * mcp-proxy側で shutdownScheduler が実行されるため、
 * manager側では何もしない。
 */
export const stopAllSchedules = (): void => {
  // mcp-proxy側で shutdownScheduler が停止するため
  // manager側では何もしない
  console.log("[Scheduler] Schedules are stopped by mcp-proxy");
};

/**
 * アクティブなスケジュール数を取得
 *
 * mcp-proxy側のステータスAPIを呼び出して取得する。
 * ローカルでは取得できないため、0を返す。
 *
 * @returns アクティブなスケジュール数
 */
export const getActiveScheduleCount = (): number => {
  // mcp-proxy側のステータスAPIを呼び出す必要があるが、
  // 同期的に取得できないため0を返す
  return 0;
};
