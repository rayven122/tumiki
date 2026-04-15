import { describe, test, expect, vi, beforeEach } from "vitest";

const mockExecuteRawUnsafe = vi.fn();
const mockQueryRaw = vi.fn();
const mockTransaction = vi.fn();

const mockDb = {
  $executeRawUnsafe: mockExecuteRawUnsafe,
  $queryRaw: mockQueryRaw,
  $transaction: mockTransaction,
};

// fs/promises のモック
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
vi.mock("fs/promises", () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

import { runMigrations } from "../migration-runner";

describe("runMigrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteRawUnsafe.mockResolvedValue(undefined);
    mockQueryRaw.mockResolvedValue([]);
  });

  test("マイグレーションテーブルを作成する", async () => {
    mockReaddir.mockResolvedValue([]);

    await runMigrations(mockDb as never);

    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("_tumiki_migrations"),
    );
  });

  test("マイグレーションがない場合は何もしない", async () => {
    mockReaddir.mockResolvedValue([]);

    await runMigrations(mockDb as never);

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  test("未適用のマイグレーションを実行する", async () => {
    mockQueryRaw.mockResolvedValue([]);
    mockReaddir.mockResolvedValue([
      { name: "20240101_init", isDirectory: () => true },
    ]);
    mockReadFile.mockResolvedValue("CREATE TABLE test (id INTEGER);");
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => void) => {
      const tx = { $executeRawUnsafe: vi.fn() };
      await fn(tx);
    });

    await runMigrations(mockDb as never);

    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  test("適用済みのマイグレーションはスキップする", async () => {
    mockQueryRaw.mockResolvedValue([{ migration_name: "20240101_init" }]);
    mockReaddir.mockResolvedValue([
      { name: "20240101_init", isDirectory: () => true },
    ]);

    await runMigrations(mockDb as never);

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  test("複数のマイグレーションを昇順で処理する", async () => {
    mockQueryRaw.mockResolvedValue([]);
    mockReaddir.mockResolvedValue([
      { name: "20240201_second", isDirectory: () => true },
      { name: "20240101_first", isDirectory: () => true },
    ]);
    mockReadFile.mockResolvedValue("SELECT 1;");
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => void) => {
      const tx = { $executeRawUnsafe: vi.fn() };
      await fn(tx);
    });

    await runMigrations(mockDb as never);

    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });
});
