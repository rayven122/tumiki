import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuditLogSyncStatus } from "@prisma/desktop-client";
import type { AuditLog } from "@prisma/desktop-client";

const storeData = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../../../shared/manager-api-client", () => ({
  postManagerApi: vi.fn(),
}));
vi.mock("../../../shared/db", () => ({
  getDb: vi.fn(),
}));
vi.mock("../../../shared/app-store", () => ({
  getAppStore: () =>
    Promise.resolve({
      get: (key: string) => storeData.get(key),
      set: (key: string, value: unknown) => storeData.set(key, value),
    }),
}));
vi.mock("crypto", () => ({
  randomUUID: () => "installation-001",
}));
vi.mock("../../../shared/utils/logger", () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

import {
  startAuditLogManagerSyncScheduler,
  stopAuditLogManagerSyncScheduler,
  syncPendingAuditLogsToManager,
} from "../audit-log-manager-sync.service";
import { postManagerApi } from "../../../shared/manager-api-client";
import { getDb } from "../../../shared/db";
import * as logger from "../../../shared/utils/logger";

describe("audit-log-manager-sync.service", () => {
  const mockFindMany = vi.fn();
  const mockUpdateMany = vi.fn();
  const mockCount = vi.fn();
  const mockDb = {
    auditLog: {
      count: mockCount,
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
    },
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  const log = {
    id: 10,
    toolName: "list_repos",
    method: "tools/call",
    transportType: "STDIO",
    durationMs: 342,
    inputBytes: 50,
    outputBytes: 1200,
    isSuccess: true,
    errorCode: null,
    errorSummary: null,
    detail: null,
    piiDetections: null,
    piiPolicy: null,
    syncStatus: AuditLogSyncStatus.PENDING,
    syncedAt: null,
    retryCount: 0,
    lastSyncTriedAt: null,
    serverId: 3,
    connectionName: "main",
    clientName: null,
    clientVersion: null,
    createdAt: new Date("2026-05-03T10:00:00.000Z"),
  } satisfies AuditLog;

  beforeEach(async () => {
    await stopAuditLogManagerSyncScheduler();
    vi.useRealTimers();
    storeData.clear();
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([log]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    vi.mocked(postManagerApi).mockResolvedValue(
      new Response(JSON.stringify({ inserted: 1 }), { status: 200 }),
    );
  });

  afterEach(async () => {
    await stopAuditLogManagerSyncScheduler();
    vi.useRealTimers();
  });

  test("未同期ログがない場合はPOSTしない", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await syncPendingAuditLogsToManager();

    expect(result).toStrictEqual({
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: false,
    });
    expect(postManagerApi).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  test("未同期ログをinternal-managerへまとめてPOSTし、成功時にSYNCEDへ更新する", async () => {
    const result = await syncPendingAuditLogsToManager();

    expect(result).toStrictEqual({
      attempted: 1,
      synced: 1,
      failed: 0,
      skipped: false,
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        syncStatus: {
          in: [AuditLogSyncStatus.PENDING, AuditLogSyncStatus.FAILED],
        },
        retryCount: { lt: 10 },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    expect(postManagerApi).toHaveBeenCalledWith(
      "/api/internal/audit-logs",
      {
        logs: [
          {
            mcpServerId: "3",
            sourceAuditLogId: 10,
            sourceInstallationId: "installation-001",
            toolName: "list_repos",
            method: "tools/call",
            httpStatus: 200,
            durationMs: 342,
            inputBytes: 50,
            outputBytes: 1200,
            errorCode: undefined,
            errorSummary: undefined,
            occurredAt: "2026-05-03T10:00:00.000Z",
          },
        ],
      },
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      data: {
        syncStatus: AuditLogSyncStatus.SYNCED,
        syncedAt: expect.any(Date),
        lastSyncTriedAt: expect.any(Date),
      },
    });
  });

  test("既存のinstallation IDを使って重複排除キーを安定させる", async () => {
    storeData.set("installationId", "existing-installation");

    await syncPendingAuditLogsToManager();

    expect(postManagerApi).toHaveBeenCalledWith(
      "/api/internal/audit-logs",
      expect.objectContaining({
        logs: [
          expect.objectContaining({
            sourceAuditLogId: 10,
            sourceInstallationId: "existing-installation",
          }),
        ],
      }),
      expect.anything(),
    );
  });

  test("Manager API clientがスキップした場合は同期状態を変更しない", async () => {
    vi.mocked(postManagerApi).mockResolvedValue(null);

    const result = await syncPendingAuditLogsToManager();

    expect(result).toStrictEqual({
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: true,
    });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  test("POSTが失敗した場合はFAILEDへ更新しretryCountを増やす", async () => {
    vi.mocked(postManagerApi).mockResolvedValue(
      new Response("error", { status: 500 }),
    );

    const result = await syncPendingAuditLogsToManager();

    expect(result).toStrictEqual({
      attempted: 1,
      synced: 0,
      failed: 1,
      skipped: false,
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      data: {
        syncStatus: AuditLogSyncStatus.FAILED,
        lastSyncTriedAt: expect.any(Date),
        retryCount: { increment: 1 },
      },
    });
  });

  test("POST失敗後のFAILED更新が失敗しても同期結果を返す", async () => {
    vi.mocked(postManagerApi).mockRejectedValue(new Error("network error"));
    mockUpdateMany.mockRejectedValue(new Error("DB error"));

    const result = await syncPendingAuditLogsToManager();

    expect(result).toStrictEqual({
      attempted: 1,
      synced: 0,
      failed: 1,
      skipped: false,
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      data: {
        syncStatus: AuditLogSyncStatus.FAILED,
        lastSyncTriedAt: expect.any(Date),
        retryCount: { increment: 1 },
      },
    });
  });

  test("retryCountが上限未満のログだけを同期対象にする", async () => {
    await syncPendingAuditLogsToManager();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          syncStatus: {
            in: [AuditLogSyncStatus.PENDING, AuditLogSyncStatus.FAILED],
          },
          retryCount: { lt: 10 },
        },
      }),
    );
  });

  test("retryCountが上限に達したログがある場合はwarningログを出す", async () => {
    mockCount.mockResolvedValue(2);

    await syncPendingAuditLogsToManager();

    expect(mockCount).toHaveBeenCalledWith({
      where: {
        syncStatus: AuditLogSyncStatus.FAILED,
        retryCount: { gte: 10 },
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Audit logs excluded from manager sync after max retries",
      { abandonedCount: 2 },
    );
  });

  test("retryCount上限ログの件数取得に失敗しても同期を継続する", async () => {
    mockCount.mockRejectedValue(new Error("count failed"));

    const result = await syncPendingAuditLogsToManager();

    expect(result).toStrictEqual({
      attempted: 1,
      synced: 1,
      failed: 0,
      skipped: false,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to count audit logs excluded from manager sync",
      { error: "count failed" },
    );
    expect(postManagerApi).toHaveBeenCalled();
  });

  test("schedulerは起動時に即時同期し、15分おきに再実行する", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mockFindMany.mockResolvedValue([]);

    startAuditLogManagerSyncScheduler();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFindMany).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });

  test("schedulerは二重起動しない", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mockFindMany.mockResolvedValue([]);

    startAuditLogManagerSyncScheduler();
    startAuditLogManagerSyncScheduler();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockFindMany).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });

  test("stopAuditLogManagerSyncSchedulerは定期同期を停止する", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mockFindMany.mockResolvedValue([]);

    startAuditLogManagerSyncScheduler();
    await vi.advanceTimersByTimeAsync(0);
    await stopAuditLogManagerSyncScheduler();
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  test("同期中に再度呼び出されるとskipped: trueを返す", async () => {
    let resolveFindMany: (value: AuditLog[]) => void = () => {};
    mockFindMany.mockReturnValueOnce(
      new Promise<AuditLog[]>((resolve) => {
        resolveFindMany = resolve;
      }),
    );

    const firstSync = syncPendingAuditLogsToManager();
    await Promise.resolve();
    const secondResult = await syncPendingAuditLogsToManager();

    expect(secondResult).toStrictEqual({
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: true,
    });

    resolveFindMany([]);
    await expect(firstSync).resolves.toStrictEqual({
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: false,
    });
  });
});
