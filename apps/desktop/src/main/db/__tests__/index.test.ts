import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name === "userData") {
        return "/test/user/data";
      }
      return "/test";
    },
  },
}));

vi.mock("fs", () => ({
  existsSync: () => true,
  mkdirSync: () => undefined,
}));

vi.mock("../../../../prisma/generated/client", () => {
  // シングルトンインスタンスを作成（全てのnew PrismaClient()呼び出しで同じインスタンスを返す）
  let instance: {
    $connect: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
    $queryRaw: ReturnType<typeof vi.fn>;
  } | null = null;

  return {
    PrismaClient: function () {
      if (!instance) {
        instance = {
          $connect: vi.fn().mockResolvedValue(undefined),
          $disconnect: vi.fn().mockResolvedValue(undefined),
          $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
        };
      }
      return instance;
    },
  };
});

vi.mock("../../utils/logger", () => ({
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}));

// グローバルなクリーンアップ - すべてのテスト後にタイマーを実タイマーに戻す
afterEach(() => {
  // すべてのタイマーをクリアしてから実タイマーに戻す
  vi.clearAllTimers();
  vi.useRealTimers();
});

// モジュールの動的インポート用の変数
let getDb: typeof import("../index").getDb;
let initializeDb: typeof import("../index").initializeDb;
let closeDb: typeof import("../index").closeDb;

// モックインスタンスへの参照（各テストで更新される）
let mockPrismaClient: {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe("getDb", () => {
  beforeEach(async () => {
    // タイマーを実タイマーに戻してからモジュールをリセット
    vi.useRealTimers();

    // モジュールをリセットしてシングルトンを完全にクリア
    vi.resetModules();

    // 新しいモックインスタンスへの参照を取得
    const { PrismaClient } = await import(
      "../../../../prisma/generated/client"
    );
    mockPrismaClient = new PrismaClient() as never;

    // モジュールを再インポート
    const dbModule = await import("../index");
    getDb = dbModule.getDb;
    initializeDb = dbModule.initializeDb;
    closeDb = dbModule.closeDb;

    // モックの動作を設定（モックをクリアしてから設定）
    mockPrismaClient.$connect.mockClear();
    mockPrismaClient.$disconnect.mockClear();
    mockPrismaClient.$queryRaw.mockClear();

    mockPrismaClient.$connect.mockResolvedValue(undefined);
    mockPrismaClient.$disconnect.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  });

  test("データベース接続を取得できる", async () => {
    const db = await getDb();

    expect(db).toBeDefined();
    expect(mockPrismaClient.$connect).toHaveBeenCalled();
  });

  test("複数回呼び出しても同じインスタンスを返す（シングルトンパターン）", async () => {
    const db1 = await getDb();
    const db2 = await getDb();

    expect(db1).toBe(db2);
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
  });

  test("接続失敗時にリトライする", async () => {
    let callCount = 0;
    mockPrismaClient.$connect.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error("Connection failed"));
      }
      return Promise.resolve(undefined);
    });

    const db = await getDb();

    expect(db).toBeDefined();
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(3);
  });

  test("すべてのリトライが失敗した場合はエラーをスロー", async () => {
    mockPrismaClient.$connect.mockRejectedValue(new Error("Connection failed"));

    await expect(getDb()).rejects.toThrow();

    // 3回リトライするため、$connect は 3回呼ばれる
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(3);
  });

  test("リトライ時に指数バックオフで待機する", async () => {
    let callCount = 0;

    vi.useFakeTimers({ shouldAdvanceTime: false });

    mockPrismaClient.$connect.mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error("Connection failed"));
      }
      return Promise.resolve(undefined);
    });

    // setTimeout のスパイ
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    const promise = getDb();

    // タイマーを進める（タイムアウト + リトライのdelay）
    // withTimeoutでCONNECTION_TIMEOUT_MS(30秒)が設定されるため、十分な時間を進める
    await vi.advanceTimersByTimeAsync(1000); // 1回目のリトライ（1秒待機）
    await vi.advanceTimersByTimeAsync(2000); // 2回目のリトライ（2秒待機）

    await promise;

    // setTimeoutが呼ばれた回数を確認
    // - withTimeout: 3回（各接続試行に1回）
    // - リトライのdelay: 2回（3回目の試行は成功するので delay なし）
    // 合計: 5回
    expect(setTimeoutSpy).toHaveBeenCalledTimes(5);

    // スパイを復元してからタイマーを戻す
    setTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  test("並行して接続要求があっても同じPromiseを返す（競合状態回避）", async () => {
    let resolveConnect: (() => void) | undefined;
    mockPrismaClient.$connect.mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
    });

    // 並行して2つの接続要求
    const promise1 = getDb();
    const promise2 = getDb();

    // 接続を完了
    resolveConnect!();

    const [db1, db2] = await Promise.all([promise1, promise2]);

    // 同じインスタンスが返される
    expect(db1).toBe(db2);

    // $connect は1回だけ呼ばれる
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
  });
});

describe("initializeDb", () => {
  beforeEach(async () => {
    // タイマーを実タイマーに戻してからモジュールをリセット
    vi.useRealTimers();

    // モジュールをリセットしてシングルトンを完全にクリア
    vi.resetModules();

    // 新しいモックインスタンスへの参照を取得
    const { PrismaClient } = await import(
      "../../../../prisma/generated/client"
    );
    mockPrismaClient = new PrismaClient() as never;

    // モジュールを再インポート
    const dbModule = await import("../index");
    getDb = dbModule.getDb;
    initializeDb = dbModule.initializeDb;
    closeDb = dbModule.closeDb;

    // モックの動作を設定（モックをクリアしてから設定）
    mockPrismaClient.$connect.mockClear();
    mockPrismaClient.$disconnect.mockClear();
    mockPrismaClient.$queryRaw.mockClear();

    mockPrismaClient.$connect.mockResolvedValue(undefined);
    mockPrismaClient.$disconnect.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  });

  test("データベースを初期化できる", async () => {
    await initializeDb();

    expect(mockPrismaClient.$connect).toHaveBeenCalled();
    expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
  });

  test("初期化時に接続確認クエリを実行する", async () => {
    await initializeDb();

    expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(["SELECT 1"]);
  });

  test("接続失敗時はエラーをスロー", async () => {
    mockPrismaClient.$connect.mockRejectedValue(new Error("Connection failed"));

    await expect(initializeDb()).rejects.toThrow();
  });

  test("クエリ実行失敗時はエラーをスロー", async () => {
    mockPrismaClient.$queryRaw.mockRejectedValue(new Error("Query failed"));

    await expect(initializeDb()).rejects.toThrow();
  });
});

describe("closeDb", () => {
  beforeEach(async () => {
    // タイマーを実タイマーに戻してからモジュールをリセット
    vi.useRealTimers();

    // モジュールをリセットしてシングルトンを完全にクリア
    vi.resetModules();

    // 新しいモックインスタンスへの参照を取得
    const { PrismaClient } = await import(
      "../../../../prisma/generated/client"
    );
    mockPrismaClient = new PrismaClient() as never;

    // モジュールを再インポート
    const dbModule = await import("../index");
    getDb = dbModule.getDb;
    initializeDb = dbModule.initializeDb;
    closeDb = dbModule.closeDb;

    // モックの動作を設定（モックをクリアしてから設定）
    mockPrismaClient.$connect.mockClear();
    mockPrismaClient.$disconnect.mockClear();
    mockPrismaClient.$queryRaw.mockClear();

    mockPrismaClient.$connect.mockResolvedValue(undefined);
    mockPrismaClient.$disconnect.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  });

  test("データベース接続をクローズできる", async () => {
    // 接続を確立
    await getDb();

    // クローズ
    await closeDb();

    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
  });

  test("接続が確立されていない場合でもエラーをスローしない", async () => {
    await expect(closeDb()).resolves.not.toThrow();
  });

  test("クローズ失敗時はエラーをスロー", async () => {
    // 接続を確立
    await getDb();

    mockPrismaClient.$disconnect.mockRejectedValue(
      new Error("Disconnect failed"),
    );

    await expect(closeDb()).rejects.toThrow();
  });

  test("クローズ後に再度接続できる", async () => {
    // 接続
    const db1 = await getDb();
    expect(db1).toBeDefined();

    // クローズ
    await closeDb();

    // 再接続（新しいインスタンスが作成される）
    mockPrismaClient.$connect.mockResolvedValue(undefined);
    const db2 = await getDb();

    expect(db2).toBeDefined();
  });
});

describe("エラー回復", () => {
  beforeEach(async () => {
    // タイマーを実タイマーに戻してからモジュールをリセット
    vi.useRealTimers();

    // モジュールをリセットしてシングルトンを完全にクリア
    vi.resetModules();

    // 新しいモックインスタンスへの参照を取得
    const { PrismaClient } = await import(
      "../../../../prisma/generated/client"
    );
    mockPrismaClient = new PrismaClient() as never;

    // モジュールを再インポート
    const dbModule = await import("../index");
    getDb = dbModule.getDb;
    initializeDb = dbModule.initializeDb;
    closeDb = dbModule.closeDb;

    // モックの動作を設定（モックをクリアしてから設定）
    mockPrismaClient.$connect.mockClear();
    mockPrismaClient.$disconnect.mockClear();
    mockPrismaClient.$queryRaw.mockClear();

    mockPrismaClient.$connect.mockResolvedValue(undefined);
    mockPrismaClient.$disconnect.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  });

  test("接続失敗後に再試行で成功できる", async () => {
    // 1回目のgetDb()呼び出し: 全てのリトライで失敗させる（3回の$connect呼び出し）
    mockPrismaClient.$connect
      .mockRejectedValueOnce(new Error("First connection failed"))
      .mockRejectedValueOnce(new Error("First connection failed"))
      .mockRejectedValueOnce(new Error("First connection failed"));

    await expect(getDb()).rejects.toThrow();

    // 2回目のgetDb()呼び出し: 成功
    mockPrismaClient.$connect.mockResolvedValue(undefined);
    const db = await getDb();

    expect(db).toBeDefined();
  });

  test("一時的なエラー後に正常に接続できる", async () => {
    let callCount = 0;
    mockPrismaClient.$connect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Temporary error"));
      }
      return Promise.resolve(undefined);
    });

    const db = await getDb();

    expect(db).toBeDefined();
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(2);
  });
});

describe("toError ユーティリティ関数の動作", () => {
  beforeEach(async () => {
    // タイマーを実タイマーに戻してからモジュールをリセット
    vi.useRealTimers();

    // モジュールをリセットしてシングルトンを完全にクリア
    vi.resetModules();

    // 新しいモックインスタンスへの参照を取得
    const { PrismaClient } = await import(
      "../../../../prisma/generated/client"
    );
    mockPrismaClient = new PrismaClient() as never;

    // モジュールを再インポート
    const dbModule = await import("../index");
    getDb = dbModule.getDb;
    initializeDb = dbModule.initializeDb;
    closeDb = dbModule.closeDb;

    // モックの動作を設定（モックをクリアしてから設定）
    mockPrismaClient.$connect.mockClear();
    mockPrismaClient.$disconnect.mockClear();
    mockPrismaClient.$queryRaw.mockClear();

    mockPrismaClient.$connect.mockResolvedValue(undefined);
    mockPrismaClient.$disconnect.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  });

  test("Error オブジェクトをそのまま返す", async () => {
    const testError = new Error("Test error");
    mockPrismaClient.$connect.mockRejectedValue(testError);

    await expect(getDb()).rejects.toThrow("Test error");
  });

  test("文字列エラーを Error オブジェクトに変換する", async () => {
    mockPrismaClient.$connect.mockRejectedValue("String error");

    await expect(getDb()).rejects.toThrow();
  });

  test("数値エラーを Error オブジェクトに変換する", async () => {
    mockPrismaClient.$connect.mockRejectedValue(404);

    await expect(getDb()).rejects.toThrow();
  });

  test("null エラーを Error オブジェクトに変換する", async () => {
    mockPrismaClient.$connect.mockRejectedValue(null);

    await expect(getDb()).rejects.toThrow();
  });

  test("undefined エラーを Error オブジェクトに変換する", async () => {
    mockPrismaClient.$connect.mockRejectedValue(undefined);

    await expect(getDb()).rejects.toThrow();
  });
});
