import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Dirent } from "fs";

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

const mockReaddirSync = vi.fn<() => Dirent[]>();
const mockReadFileSync = vi.fn<() => string>();

vi.mock("fs", () => ({
  readdirSync: (...args: unknown[]) => mockReaddirSync(...(args as [])),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...(args as [])),
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
const createMockDb = () => ({
  $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  $queryRaw: vi.fn().mockResolvedValue([]),
});

// --- テスト ---

describe("runMigrations", () => {
  let runMigrations: typeof import("../migrationRunner").runMigrations;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    vi.resetModules();
    mockIsPackaged = false;
    mockAppPath = "/test/app";
    mockReaddirSync.mockReset();
    mockReadFileSync.mockReset();
    mockRandomUUID.mockReset();

    const mod = await import("../migrationRunner");
    runMigrations = mod.runMigrations;
    mockDb = createMockDb();
  });

  test("_prisma_migrationsテーブルを作成する", async () => {
    mockReaddirSync.mockReturnValue([]);

    await runMigrations(mockDb as never);

    // 最初の呼び出しがCREATE TABLE
    const firstCall = mockDb.$executeRawUnsafe.mock.calls[0]?.[0] as string;
    expect(firstCall).toContain("CREATE TABLE IF NOT EXISTS");
    expect(firstCall).toContain("_prisma_migrations");
  });

  test("適用済みマイグレーション一覧を取得する", async () => {
    mockReaddirSync.mockReturnValue([]);

    await runMigrations(mockDb as never);

    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test("マイグレーションディレクトリが空の場合は何も適用しない", async () => {
    mockReaddirSync.mockReturnValue([]);

    await runMigrations(mockDb as never);

    // CREATE TABLE の1回だけ
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  test("未適用のマイグレーションを順番に適用する", async () => {
    mockReaddirSync.mockReturnValue([
      makeDirent("20240101_init", true),
      makeDirent("20240102_add_users", true),
    ]);
    mockReadFileSync
      .mockReturnValueOnce("CREATE TABLE foo (id TEXT);")
      .mockReturnValueOnce("CREATE TABLE bar (id TEXT);");
    mockRandomUUID
      .mockReturnValueOnce("uuid-1")
      .mockReturnValueOnce("uuid-2");

    await runMigrations(mockDb as never);

    const calls = mockDb.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE _prisma_migrations
    // 2: CREATE TABLE foo (id TEXT)
    // 3: INSERT (20240101_init)
    // 4: CREATE TABLE bar (id TEXT)
    // 5: INSERT (20240102_add_users)
    expect(calls).toHaveLength(5);
    expect(calls[1]?.[0]).toContain("CREATE TABLE foo");
    expect(calls[2]?.[0]).toContain("INSERT INTO");
    expect(calls[2]?.[1]).toBe("uuid-1");
    expect(calls[2]?.[2]).toBe("20240101_init");
    expect(calls[3]?.[0]).toContain("CREATE TABLE bar");
    expect(calls[4]?.[2]).toBe("20240102_add_users");
  });

  test("適用済みのマイグレーションをスキップする", async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { migration_name: "20240101_init" },
    ]);
    mockReaddirSync.mockReturnValue([
      makeDirent("20240101_init", true),
      makeDirent("20240102_add_users", true),
    ]);
    mockReadFileSync.mockReturnValue("CREATE TABLE bar (id TEXT);");
    mockRandomUUID.mockReturnValue("uuid-new");

    await runMigrations(mockDb as never);

    // CREATE TABLE _prisma_migrations + 1ステートメント + 1 INSERT = 3
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledTimes(3);
    // readFileSyncは1回だけ（スキップされた分は読まない）
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });

  test("ファイルのみのエントリはスキップしディレクトリのみ処理する", async () => {
    mockReaddirSync.mockReturnValue([
      makeDirent("migration_lock.toml", false),
      makeDirent("20240101_init", true),
    ]);
    mockReadFileSync.mockReturnValue("CREATE TABLE foo (id TEXT);");
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as never);

    // CREATE TABLE _prisma_migrations + 1ステートメント + 1 INSERT = 3
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledTimes(3);
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

    mockReaddirSync.mockReturnValue([makeDirent("20240101_init", true)]);
    mockReadFileSync.mockReturnValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as never);

    const calls = mockDb.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE _prisma_migrations
    // 2: CREATE TABLE foo (...)
    // 3: CREATE INDEX idx ON foo(id)
    // 4: INSERT INTO _prisma_migrations
    expect(calls).toHaveLength(4);
    expect(calls[1]?.[0]).toContain("CREATE TABLE foo");
    expect((calls[1]?.[0] as string)).not.toContain("--");
    expect(calls[2]?.[0]).toContain("CREATE INDEX idx ON foo(id)");
    expect((calls[2]?.[0] as string)).not.toContain("--");
  });

  test("複数ステートメントを含むSQLを個別に実行する", async () => {
    const sql = "CREATE TABLE a (id TEXT);\nCREATE TABLE b (id TEXT);";

    mockReaddirSync.mockReturnValue([makeDirent("20240101_init", true)]);
    mockReadFileSync.mockReturnValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as never);

    const calls = mockDb.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE _prisma_migrations
    // 2: CREATE TABLE a
    // 3: CREATE TABLE b
    // 4: INSERT
    expect(calls).toHaveLength(4);
    expect(calls[1]?.[0]).toContain("CREATE TABLE a");
    expect(calls[2]?.[0]).toContain("CREATE TABLE b");
  });

  test("空のSQLステートメントは除去される", async () => {
    // 末尾セミコロン後の空文字をスキップ
    const sql = "CREATE TABLE foo (id TEXT);;";

    mockReaddirSync.mockReturnValue([makeDirent("20240101_init", true)]);
    mockReadFileSync.mockReturnValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as never);

    const calls = mockDb.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE _prisma_migrations
    // 2: CREATE TABLE foo
    // 3: INSERT
    expect(calls).toHaveLength(3);
  });

  test("コメントのみのステートメントは除去される", async () => {
    const sql = "-- comment only;\nCREATE TABLE foo (id TEXT);";

    mockReaddirSync.mockReturnValue([makeDirent("20240101_init", true)]);
    mockReadFileSync.mockReturnValue(sql);
    mockRandomUUID.mockReturnValue("uuid-1");

    await runMigrations(mockDb as never);

    const calls = mockDb.$executeRawUnsafe.mock.calls;
    // 1: CREATE TABLE _prisma_migrations
    // 2: CREATE TABLE foo
    // 3: INSERT
    expect(calls).toHaveLength(3);
  });

  test("マイグレーションディレクトリはソート順で処理される", async () => {
    // 逆順で返しても名前順にソートされる
    mockReaddirSync.mockReturnValue([
      makeDirent("20240201_second", true),
      makeDirent("20240101_first", true),
    ]);
    mockReadFileSync.mockReturnValue("SELECT 1;");
    mockRandomUUID.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");

    await runMigrations(mockDb as never);

    const insertCalls = mockDb.$executeRawUnsafe.mock.calls.filter(
      (c: unknown[]) => (c[0] as string).includes("INSERT INTO"),
    );
    expect(insertCalls[0]?.[2]).toBe("20240101_first");
    expect(insertCalls[1]?.[2]).toBe("20240201_second");
  });

  test("$executeRawUnsafeが失敗した場合エラーをスローする", async () => {
    mockReaddirSync.mockReturnValue([makeDirent("20240101_init", true)]);
    mockReadFileSync.mockReturnValue("CREATE TABLE foo (id TEXT);");
    mockRandomUUID.mockReturnValue("uuid-1");

    // 最初のCREATE TABLE _prisma_migrationsは成功、2回目でエラー
    mockDb.$executeRawUnsafe
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error("SQL execution failed"));

    await expect(runMigrations(mockDb as never)).rejects.toThrow(
      "SQL execution failed",
    );
  });

  test("$queryRawが失敗した場合エラーをスローする", async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error("Query failed"));

    await expect(runMigrations(mockDb as never)).rejects.toThrow(
      "Query failed",
    );
  });
});

describe("getMigrationsDir", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsPackaged = false;
    mockAppPath = "/test/app";
    mockReaddirSync.mockReset();
    mockReadFileSync.mockReset();
    mockRandomUUID.mockReset();
  });

  test("開発時はapp.getAppPath()直下のprisma/migrationsを返す", async () => {
    mockIsPackaged = false;
    mockReaddirSync.mockReturnValue([]);

    const { runMigrations } = await import("../migrationRunner");
    const mockDb = createMockDb();
    await runMigrations(mockDb as never);

    // readdirSyncに渡されたパスを確認
    const dirPath = mockReaddirSync.mock.calls[0]?.[0] as string;
    expect(dirPath).toBe("/test/app/prisma/migrations");
    expect(dirPath).not.toContain("app.asar.unpacked");
  });

  test("プロダクション時はapp.asar.unpackedパスを返す", async () => {
    mockIsPackaged = true;
    mockAppPath = "/path/to/app.asar";
    mockReaddirSync.mockReturnValue([]);

    const { runMigrations } = await import("../migrationRunner");
    const mockDb = createMockDb();
    await runMigrations(mockDb as never);

    const dirPath = mockReaddirSync.mock.calls[0]?.[0] as string;
    expect(dirPath).toBe("/path/to/app.asar.unpacked/prisma/migrations");
  });
});
