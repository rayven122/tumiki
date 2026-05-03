import { beforeEach, describe, expect, test, vi } from "vitest";

const storeData = vi.hoisted(() => new Map<string, unknown>());

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));

vi.mock("../../../shared/app-store", () => ({
  getAppStore: () =>
    Promise.resolve({
      get: (key: string) => storeData.get(key),
      set: (key: string, value: unknown) => storeData.set(key, value),
      delete: (key: string) => storeData.delete(key),
    }),
}));
vi.mock("../../../shared/db");
vi.mock("../../../utils/encryption");
vi.mock("../../../shared/utils/logger");

import { syncAuditLogToManager } from "../audit-log.sync";
import { getDb } from "../../../shared/db";
import { decryptToken } from "../../../utils/encryption";

describe("audit-log.sync", () => {
  const mockFindFirst = vi.fn();
  const mockDeleteMany = vi.fn();
  const mockDb = {
    authToken: {
      findFirst: mockFindFirst,
      deleteMany: mockDeleteMany,
    },
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  const input = {
    toolName: "list_repos",
    method: "tools/call" as const,
    transportType: "STDIO" as const,
    durationMs: 342,
    inputBytes: 50,
    outputBytes: 1200,
    isSuccess: true,
    serverId: 3,
    connectionName: "main",
    createdAt: new Date("2026-05-03T10:00:00.000Z"),
  };

  beforeEach(() => {
    storeData.clear();
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(decryptToken).mockResolvedValue("access-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ inserted: 1 }),
      }),
    );
  });

  test("Manager URLが未設定なら送信しない", async () => {
    const result = await syncAuditLogToManager(input);

    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("有効な認証トークンでinternal-managerへ監査ログをPOSTする", async () => {
    storeData.set("managerUrl", "https://manager.example.com/");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-05-03T09:00:00.000Z"),
      updatedAt: new Date("2026-05-03T09:00:00.000Z"),
    });

    const result = await syncAuditLogToManager(input);

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://manager.example.com/api/internal/audit-logs",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logs: [
            {
              mcpServerId: "3",
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
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  test("期限切れトークンは削除して送信しない", async () => {
    storeData.set("managerUrl", "https://manager.example.com");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncAuditLogToManager(input);

    expect(result).toBe(false);
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
