import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Dirent } from "fs";
import type { PrismaClient } from "../../../../../prisma/generated/client";

// --- モック定義 ---

let mockIsPackaged = false;
let mockAppPath = "/test/app";

vi.mock("electron", () => ({
  app: {
    getAppPath: () => mockAppPath,
    get isPackaged() {
      return mockIsPackaged;
    },
  },
}));

vi.mock("../../utils/logger", () => ({
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}));

const mockReaddir = vi.fn<() => Promise<Dirent[]>>();
const mockReadFile = vi.fn<() => Promise<string>>();

vi.mock("fs/promises", () => ({
  readdir: (...args: unknown[]) => mockReaddir(...(args as [])),
  readFile: (...args: unknown[]) => mockReadFile(...(args as [])),
}));

const mockRandomUUID = vi.fn<() => string>();

vi.mock("crypto", () => ({
  randomUUID: () => mockRandomUUID(),
}));

// --- ヘルパー ---

/** Direntオブジェクトのスタブ生成 */
const makeDirent = (name: string, isDir: boolean): Dirent =>
  ({
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
  }) as unknown as Dirent;

/** モックDBクライアント生成 */
const createMockDb = () => {
  const txMock = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  };
  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<void>) => {
      await fn(txMock);
    }),
    /** トランザクション内のモック */
    tx: txMock,
  };
};

// --- テスト ---

describe("runMigrations", () => {
  let runMigrations: typeof import("../migrationRunner").runMigrations;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    vi.resetModules();
    mockIsPackaged = false;
    mockAppPath = "/test/app";
    mockReaddir.mockReset();
    mockReadFile.mockReset();
    mockRandomUUID.mockReset();

    const mod = await import("../migrationRunner");
    runMigrations = mod.runMigrations;
    mockDb = createMockDb();
  });

  test("_tumiki_migrationsテーブルを作成する", async () => {
    mockReaddir.mockResolvedValue([]);

    await runMigrations(mockDb as unknown as PrismaClient);

    // 最初の呼び出しがCREATE TABLE
    const firstCall = mockDb.$executeRawUnsafe.mock.calls[0]?.[0] as string;
    expect(firstCall).toContain("CREATE TABLE IF NOT EXISTS");
    expect(firstCall).toContain("_tumiki_migrations");
  });

  test("適用済みマイグレーション一覧を取得する", async () => {
    mockReaddir.mockResolvedValue([]);

    await runMigrations(mockDb as unknown as PrismaClient);

    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test("マイグレーションディレクトリが空の場合は何も適用しない", async () => {
    mockReaddir.mockResolvedValue([]);

    await runMigrations(mockDb as unknown as PrismaClient);

    // CREATE TABLE の1回だけ（トランザクションは呼ばれない）
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  test("未適用のマイグレーションをトランザクション内で順番に適用する", async () => {
    mockReaddir.mockResolvedValue([
      makeDirent("20240101_init", true),
      makeDirent("20240102_add_users", true),
    ]);
    mockReadFile
      .mockResolvedValueOnce("CREATE TABLE foo (id TEXT);")
      .mockResolvedValueOnce("CREATE TABLE bar (id TEXT);");
    mockRandomUUID.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");

    await runMigrations(mockDb as unknown as PrismaClient);

    // $transactionが2回呼ばれる（各マイグレーションごと）
    expect(mockDb.$transaction).toHaveBeenCalledTimes(2);

    // tx内でSQL + INSERTが実行される
    const txCalls = mockDb.tx.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE foo
    // 2: INSERT (20240101_init)
    // 3: CREATE TABLE bar
    // 4: INSERT (20240102_add_users)
    expect(txCalls).toHaveLength(4);
    expect(txCalls[0]?.[0]).toContain("CREATE TABLE foo");
    expect(txCalls[1]?.[0]).toContain("INSERT INTO");
    expect(txCalls[1]?.[1]).toBe("uuid-1");
    expect(txCalls[1]?.[2]).toBe("20240101_init");
    expect(txCalls[2]?.[0]).toContain("CREATE TABLE bar");
    expect(txCalls[3]?.[2]).toBe("20240102_add_users");
  });

  test("適用済みのマイグレーションをスキップする", async () => {
    mockDb.$queryRaw.mockResolvedValue([{ migration_name: "20240101_init" }]);
    mockReaddir.mockResolvedValue([
      makeDirent("20240101_init", true),
      makeDirent("20240102_add_users", true),
    ]);
    mockReadFile.mockResolvedValue("CREATE TABLE bar (id TEXT);");
    mockRandomUUID.mockReturnValue("uuid-new");

    await runMigrations(mockDb as unknown as PrismaClient);

    // トランザクションは1回だけ（スキップ分は呼ばれない）
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    // readFileSyncは1回だけ
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  test("ファイルのみのエントリはスキップしディレクトリのみ処理する", async () => {
    mockReaddir.mockResolvedValue([
      makeDirent("migration_lock.toml", false),
      makeDirent("20240101_init", true),
    ]);
    mockReadFile.mockResolvedValue("CREATE TABLE foo (id TEXT);");
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as unknown as PrismaClient);

    // トランザクションは1回だけ
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    // tx内: 1ステートメント + 1 INSERT = 2
    expect(mockDb.tx.$executeRawUnsafe).toHaveBeenCalledTimes(2);
  });

  test("コメント行付きのSQLを正しく分割して実行する", async () => {
    const sql = [
      "-- CreateTable",
      "CREATE TABLE foo (",
      "  id TEXT",
      ");",
      "-- CreateIndex",
      "CREATE INDEX idx ON foo(id);",
    ].join("\n");

    mockReaddir.mockResolvedValue([makeDirent("20240101_init", true)]);
    mockReadFile.mockResolvedValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as unknown as PrismaClient);

    const txCalls = mockDb.tx.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE foo (...)
    // 2: CREATE INDEX idx ON foo(id)
    // 3: INSERT INTO _tumiki_migrations
    expect(txCalls).toHaveLength(3);
    expect(txCalls[0]?.[0]).toContain("CREATE TABLE foo");
    expect(txCalls[0]?.[0] as string).not.toContain("--");
    expect(txCalls[1]?.[0]).toContain("CREATE INDEX idx ON foo(id)");
    expect(txCalls[1]?.[0] as string).not.toContain("--");
  });

  test("複数ステートメントを含むSQLを個別に実行する", async () => {
    const sql = "CREATE TABLE a (id TEXT);\nCREATE TABLE b (id TEXT);";

    mockReaddir.mockResolvedValue([makeDirent("20240101_init", true)]);
    mockReadFile.mockResolvedValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as unknown as PrismaClient);

    const txCalls = mockDb.tx.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE a
    // 2: CREATE TABLE b
    // 3: INSERT
    expect(txCalls).toHaveLength(3);
    expect(txCalls[0]?.[0]).toContain("CREATE TABLE a");
    expect(txCalls[1]?.[0]).toContain("CREATE TABLE b");
  });

  test("空のSQLステートメントは除去される", async () => {
    // 末尾セミコロン後の空文字をスキップ
    const sql = "CREATE TABLE foo (id TEXT);;";

    mockReaddir.mockResolvedValue([makeDirent("20240101_init", true)]);
    mockReadFile.mockResolvedValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as unknown as PrismaClient);

    const txCalls = mockDb.tx.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE foo
    // 2: INSERT
    expect(txCalls).toHaveLength(2);
  });

  test("コメントのみのステートメントは除去される", async () => {
    const sql = "-- comment only;\nCREATE TABLE foo (id TEXT);";

    mockReaddir.mockResolvedValue([makeDirent("20240101_init", true)]);
    mockReadFile.mockResolvedValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as unknown as PrismaClient);

    const txCalls = mockDb.tx.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE foo
    // 2: INSERT
    expect(txCalls).toHaveLength(2);
  });

  test("マイグレーションディレクトリはソート順で処理される", async () => {
    // 逆順で返しても名前順にソートされる
    mockReaddir.mockResolvedValue([
      makeDirent("20240201_second", true),
      makeDirent("20240101_first", true),
    ]);
    mockReadFile.mockResolvedValue("SELECT 1;");
    mockRandomUUID.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");

    await runMigrations(mockDb as unknown as PrismaClient);

    const txCalls = mockDb.tx.$executeRawUnsafe.mock.calls;
    const insertCalls = txCalls.filter((c: unknown[]) =>
      (c[0] as string).includes("INSERT INTO"),
    );
    expect(insertCalls[0]?.[2]).toBe("20240101_first");
    expect(insertCalls[1]?.[2]).toBe("20240201_second");
  });

  test("トランザクション内でSQL実行が失敗した場合エラーをスローする", async () => {
    mockReaddir.mockResolvedValue([makeDirent("20240101_init", true)]);
    mockReadFile.mockResolvedValue("CREATE TABLE foo (id TEXT);");
    mockRandomUUID.mockReturnValue("uuid-1");

    // tx内のSQL実行でエラー
    mockDb.tx.$executeRawUnsafe.mockRejectedValueOnce(
      new Error("SQL execution failed"),
    );

    await expect(
      runMigrations(mockDb as unknown as PrismaClient),
    ).rejects.toThrow("SQL execution failed");
  });

  test("$queryRawが失敗した場合エラーをスローする", async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error("Query failed"));

    await expect(
      runMigrations(mockDb as unknown as PrismaClient),
    ).rejects.toThrow("Query failed");
  });
});

describe("getMigrationsDir", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsPackaged = false;
    mockAppPath = "/test/app";
    mockReaddir.mockReset();
    mockReadFile.mockReset();
    mockRandomUUID.mockReset();
  });

  test("開発時はapp.getAppPath()直下のprisma/migrationsを返す", async () => {
    mockIsPackaged = false;
    mockReaddir.mockResolvedValue([]);

    const { runMigrations } = await import("../migrationRunner");
    const mockDb = createMockDb();
    await runMigrations(mockDb as unknown as PrismaClient);

    // readdirSyncに渡されたパスを確認
    const dirPath = (mockReaddir.mock.calls[0] as unknown as [string])[0];
    expect(dirPath).toBe("/test/app/prisma/migrations");
    expect(dirPath).not.toContain("app.asar.unpacked");
  });

  test("プロダクション時はapp.asar.unpackedパスを返す", async () => {
    mockIsPackaged = true;
    mockAppPath = "/path/to/app.asar";
    mockReaddir.mockResolvedValue([]);

    const { runMigrations } = await import("../migrationRunner");
    const mockDb = createMockDb();
    await runMigrations(mockDb as unknown as PrismaClient);

    const dirPath = (mockReaddir.mock.calls[0] as unknown as [string])[0];
    expect(dirPath).toBe("/path/to/app.asar.unpacked/prisma/migrations");
  });
});
