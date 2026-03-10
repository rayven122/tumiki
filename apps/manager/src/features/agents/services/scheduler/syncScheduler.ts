/**
 * mcp-proxyへのスケジュール同期
 *
 * manager側でスケジュールが作成・更新・削除された際に、
 * mcp-proxyのスケジューラに同期するための機能
 */

/** mcp-proxyの内部API URL */
const MCP_PROXY_INTERNAL_URL =
  process.env.MCP_PROXY_INTERNAL_URL ?? "http://localhost:3456";

/** スケジュール設定 */
type ScheduleConfig = {
  id: string;
  agentId: string;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  message?: string;
};

/**
 * スケジュールを登録
 *
 * @param schedule - スケジュール設定
 */
export const registerScheduleToProxy = async (
  schedule: ScheduleConfig,
): Promise<void> => {
  try {
    const response = await fetch(
      `${MCP_PROXY_INTERNAL_URL}/internal/scheduler/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", schedule }),
      },
    );

    if (!response.ok) {
      console.error(`[Scheduler] Register failed: HTTP ${response.status}`);
    } else {
      console.log(`[Scheduler] Register succeeded: ${schedule.id}`);
    }
  } catch (error) {
    console.error("[Scheduler] Register error:", error);
  }
};

/**
 * スケジュールを解除
 *
 * @param scheduleId - スケジュールID
 */
export const unregisterScheduleFromProxy = async (
  scheduleId: string,
): Promise<void> => {
  try {
    const response = await fetch(
      `${MCP_PROXY_INTERNAL_URL}/internal/scheduler/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unregister", scheduleId }),
      },
    );

    if (!response.ok) {
      console.error(`[Scheduler] Unregister failed: HTTP ${response.status}`);
    } else {
      console.log(`[Scheduler] Unregister succeeded: ${scheduleId}`);
    }
  } catch (error) {
    console.error("[Scheduler] Unregister error:", error);
  }
};
