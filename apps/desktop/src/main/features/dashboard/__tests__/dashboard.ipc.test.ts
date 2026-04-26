import { describe, test, expect, beforeEach, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

// IPCハンドラーをキャプチャするためのモック
const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      mockIpcHandlers.set(
        channel,
        handler as (
          event: IpcMainInvokeEvent,
          ...args: unknown[]
        ) => Promise<unknown>,
      );
    },
  },
}));

vi.mock("../../../shared/utils/logger");
vi.mock("../dashboard.service");

// テスト対象のインポート（モックの後に行う）
import { setupDashboardIpc } from "../dashboard.ipc";
import * as dashboardService from "../dashboard.service";
import type { DashboardResult } from "../dashboard.types";

describe("setupDashboardIpc", () => {
  beforeEach(() => {
    mockIpcHandlers.clear();
    vi.clearAllMocks();
    setupDashboardIpc();
  });

  describe("dashboard:get", () => {
    const mockResult = {
      period: "24h",
      kpi: {
        requests: 0,
        requestsDelta: 0,
        blocks: 0,
        blockRate: 0,
        successRate: 0,
        successRateDelta: 0,
        connectors: 0,
        connectorsDegraded: 0,
      },
      timeline: [],
      series: [],
      aiClients: [],
      connectors: [],
      recentLogs: [],
    } as unknown as DashboardResult;

    test("有効な期間でダッシュボードを取得する", async () => {
      vi.mocked(dashboardService.getDashboard).mockResolvedValue(mockResult);
      const handler = mockIpcHandlers.get("dashboard:get");

      const result = await handler!({} as IpcMainInvokeEvent, {
        period: "24h",
      });

      expect(result).toStrictEqual(mockResult);
      expect(dashboardService.getDashboard).toHaveBeenCalledWith({
        period: "24h",
      });
    });

    test("7d / 30d 期間も受け付ける", async () => {
      vi.mocked(dashboardService.getDashboard).mockResolvedValue(mockResult);
      const handler = mockIpcHandlers.get("dashboard:get");

      await handler!({} as IpcMainInvokeEvent, { period: "7d" });
      await handler!({} as IpcMainInvokeEvent, { period: "30d" });

      expect(dashboardService.getDashboard).toHaveBeenNthCalledWith(1, {
        period: "7d",
      });
      expect(dashboardService.getDashboard).toHaveBeenNthCalledWith(2, {
        period: "30d",
      });
    });

    test("periodが不正な値の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("dashboard:get");

      await expect(
        handler!({} as IpcMainInvokeEvent, { period: "1h" }),
      ).rejects.toThrow("ダッシュボードデータの取得に失敗しました");
    });

    test("periodが欠落している場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("dashboard:get");

      await expect(handler!({} as IpcMainInvokeEvent, {})).rejects.toThrow(
        "ダッシュボードデータの取得に失敗しました",
      );
    });

    test("入力がオブジェクトでない場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("dashboard:get");

      await expect(
        handler!({} as IpcMainInvokeEvent, "invalid"),
      ).rejects.toThrow("ダッシュボードデータの取得に失敗しました");
    });

    test("サービスがエラーを投げた場合はラップして再スローする", async () => {
      vi.mocked(dashboardService.getDashboard).mockRejectedValue(
        new Error("DB接続エラー"),
      );
      const handler = mockIpcHandlers.get("dashboard:get");

      await expect(
        handler!({} as IpcMainInvokeEvent, { period: "24h" }),
      ).rejects.toThrow(
        "ダッシュボードデータの取得に失敗しました: DB接続エラー",
      );
    });
  });

  describe("ハンドラー登録", () => {
    test("dashboard:get ハンドラーが登録される", () => {
      expect(mockIpcHandlers.has("dashboard:get")).toBe(true);
    });
  });
});
