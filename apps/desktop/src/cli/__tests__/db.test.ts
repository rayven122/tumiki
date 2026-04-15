import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../../shared/user-data-path", () => ({
  resolveUserDataPath: vi.fn(() => "/mock/user-data"),
}));

const mockDisconnect = vi.fn().mockResolvedValue(undefined);

vi.mock("@prisma/desktop-client", () => ({
  PrismaClient: vi.fn(() => ({
    $disconnect: mockDisconnect,
  })),
}));

describe("db", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // シングルトンをリセットするためにresetModulesしてから再importする
    vi.resetModules();

    // resetModules後もmockは再登録が必要
    vi.doMock("../../shared/user-data-path", () => ({
      resolveUserDataPath: vi.fn(() => "/mock/user-data"),
    }));
    vi.doMock("@prisma/desktop-client", () => ({
      PrismaClient: vi.fn(() => ({
        $disconnect: mockDisconnect,
      })),
    }));
  });

  test("getDbがPrismaClientインスタンスを返す", async () => {
    const { getDb } = await import("../db");
    const db = getDb();
    expect(db).toBeDefined();
  });

  test("getDbを2回呼んでも同じインスタンスを返す（シングルトン）", async () => {
    const { getDb } = await import("../db");
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  test("closeDb後に再度getDbを呼ぶと新しいインスタンスを作成する", async () => {
    const { getDb, closeDb } = await import("../db");
    const db1 = getDb();
    await closeDb();
    expect(mockDisconnect).toHaveBeenCalledOnce();

    const db2 = getDb();
    expect(db1).not.toBe(db2);
    await closeDb();
  });
});
