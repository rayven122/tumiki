import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import type { ChildProcess } from "child_process";
import type {
  McpServerState,
  McpToolInfo,
  CallToolResult,
} from "@tumiki/mcp-proxy-core";

// --- 型定義 ---

// ProxyResponse はdiscriminated unionのため、Omit が正しく分配されない。
// respondToRequest用にidなしのレスポンス型を定義
type ResponseWithoutId =
  | { ok: true; result?: unknown }
  | { ok: false; error: string };

// --- モック定義 ---

const createMockProcess = (): ChildProcess & EventEmitter => {
  const proc = new EventEmitter() as ChildProcess & EventEmitter;
  Object.defineProperty(proc, "pid", { value: 12345, writable: true });
  proc.send = vi.fn().mockReturnValue(true);
  proc.kill = vi.fn().mockReturnValue(true);
  Object.defineProperty(proc, "stderr", {
    value: new EventEmitter(),
    writable: true,
  });
  return proc;
};

let mockProcess: ChildProcess & EventEmitter;

vi.mock("child_process", () => ({
  fork: vi.fn(() => mockProcess),
}));

let uuidCounter = 0;
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
}));

vi.mock("../../../shared/utils/logger", () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}));

// audit-log.service をモック（DB・Electron非依存にする）
vi.mock("../../audit-log/audit-log.service", () => ({
  recordMcpToolCall: vi.fn(),
}));

// features/mcp-server-list/mcp.service の getEnabledConfigs をモック（DB非依存にする）
vi.mock("../../mcp-server-list/mcp.service", () => ({
  getEnabledConfigs: vi
    .fn()
    .mockResolvedValue([
      { name: "test-server", command: "echo", args: ["hello"], env: {} },
    ]),
}));

// --- ヘルパー ---

/**
 * proxyProcess.send() に渡されたリクエストのidを使ってレスポンスを返す
 * proc引数で対象プロセスを指定可能（リトライテスト用）
 */
const respondToRequest = (
  response: ResponseWithoutId,
  proc?: ChildProcess & EventEmitter,
  requestIndex = 0,
): void => {
  const target = proc ?? mockProcess;
  const send = target.send as ReturnType<typeof vi.fn>;
  const call = send.mock.calls[requestIndex];
  if (!call)
    throw new Error(`send() の呼び出し #${requestIndex} が見つかりません`);
  const request = call[0] as { id: string };
  target.emit("message", { id: request.id, ...response });
};

/** vi.resetModules() 後にサービスを再インポート */
const importService = async () => {
  vi.resetModules();
  uuidCounter = 0;
  return (await import("../mcp.service")) as typeof import("../mcp.service");
};

/**
 * プロセス起動の共通ヘルパー
 * fork → spawn発火 → startリクエスト応答まで一括で行う
 */
const spawnAndStart = async (
  service: Awaited<ReturnType<typeof importService>>,
): Promise<void> => {
  const promise = service.startMcpServers();
  // fork直後にspawnを発火（実際のforkと同様にlistener登録後）
  mockProcess.emit("spawn");
  // 非同期チェーンを進める
  await vi.advanceTimersByTimeAsync(0);
  respondToRequest({ ok: true, result: [] });
  await promise;
};

// --- テスト ---

describe("mcp.service", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mockProcess = createMockProcess();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startMcpServers", () => {
    test("プロセスを起動し、startリクエストを送信してレスポンスを返す", async () => {
      const service = await importService();

      const serverStates: McpServerState[] = [
        { name: "serena", status: "running", tools: [] },
      ];

      const promise = service.startMcpServers();
      mockProcess.emit("spawn");
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: serverStates });
      const result = await promise;

      expect(result).toStrictEqual(serverStates);
    });

    test("レスポンスがエラーの場合はthrowする", async () => {
      const service = await importService();

      const promise = service.startMcpServers();
      mockProcess.emit("spawn");
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: false, error: "起動失敗" });

      await expect(promise).rejects.toThrow("起動失敗");
    });

    test("レスポンス形式が不正な場合はthrowする", async () => {
      const service = await importService();

      const promise = service.startMcpServers();
      mockProcess.emit("spawn");
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: [{ invalid: true }] });

      await expect(promise).rejects.toThrow("不正なレスポンス形式");
    });

    test("2回目の呼び出しではプロセスを再起動しない", async () => {
      const { fork } = await import("child_process");
      const service = await importService();

      // 1回目
      await spawnAndStart(service);

      // 2回目（プロセスは既に起動済み）
      const p2 = service.startMcpServers();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: [] }, mockProcess, 1);
      await p2;

      expect(fork).toHaveBeenCalledTimes(1);
    });
  });

  describe("stopMcpServers", () => {
    test("stopリクエストを送信する", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const stopPromise = service.stopMcpServers();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true }, mockProcess, 1);
      await stopPromise;
    });

    test("プロセス未起動時は何もしない", async () => {
      const service = await importService();
      await service.stopMcpServers();
    });

    test("レスポンスがエラーの場合はthrowする", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const stopPromise = service.stopMcpServers();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: false, error: "停止失敗" }, mockProcess, 1);

      await expect(stopPromise).rejects.toThrow("停止失敗");
    });
  });

  describe("listMcpTools", () => {
    test("ツール一覧を返す", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const tools: McpToolInfo[] = [
        {
          name: "read_file",
          description: "ファイルを読む",
          inputSchema: {},
          serverName: "serena",
        },
      ];

      const listPromise = service.listMcpTools();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: tools }, mockProcess, 1);
      const result = await listPromise;

      expect(result).toStrictEqual(tools);
    });

    test("プロセス未起動時はthrowする", async () => {
      const service = await importService();
      await expect(service.listMcpTools()).rejects.toThrow(
        "Proxy Processが起動していません",
      );
    });
  });

  describe("callMcpTool", () => {
    test("ツールを実行して結果を返す", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const toolResult: CallToolResult = {
        content: [{ type: "text", text: "結果" }],
        isError: false,
      };

      const callPromise = service.callMcpTool("read_file", { path: "/tmp" });
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: toolResult }, mockProcess, 1);
      const result = await callPromise;

      expect(result).toStrictEqual(toolResult);

      // send()に正しいペイロードが渡されていることを確認
      const send = mockProcess.send as ReturnType<typeof vi.fn>;
      const callToolRequest = send.mock.calls[1]?.[0] as Record<
        string,
        unknown
      >;
      expect(callToolRequest).toStrictEqual(
        expect.objectContaining({
          type: "call-tool",
          payload: { name: "read_file", arguments: { path: "/tmp" } },
        }),
      );
    });

    test("プロセス未起動時はthrowする", async () => {
      const service = await importService();
      await expect(service.callMcpTool("tool", {})).rejects.toThrow(
        "Proxy Processが起動していません",
      );
    });
  });

  describe("getMcpStatus", () => {
    test("プロセス未起動時は空配列を返す", async () => {
      const service = await importService();
      const result = await service.getMcpStatus();
      expect(result).toStrictEqual([]);
    });

    test("サーバー状態を返す", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const states: McpServerState[] = [
        { name: "serena", status: "running", tools: [] },
      ];

      const statusPromise = service.getMcpStatus();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: states }, mockProcess, 1);
      const result = await statusPromise;

      expect(result).toStrictEqual(states);
    });
  });

  describe("stopProxy", () => {
    test("プロセス未起動時は何もしない", async () => {
      const service = await importService();
      await service.stopProxy();
    });

    test("stopリクエスト送信後にプロセスをkillする", async () => {
      const service = await importService();
      await spawnAndStart(service);

      // process.kill をスパイ
      const processKillSpy = vi
        .spyOn(process, "kill")
        .mockReturnValue(true as never);

      const stopPromise = service.stopProxy();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true }, mockProcess, 1);
      await stopPromise;

      // macOS/Linux: process.kill(-pid, "SIGTERM") が呼ばれる
      expect(processKillSpy).toHaveBeenCalledWith(-12345, "SIGTERM");
      processKillSpy.mockRestore();
    });

    test("シャットダウンタイムアウト時は強制終了する", async () => {
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      const processKillSpy = vi
        .spyOn(process, "kill")
        .mockReturnValue(true as never);

      const stopPromise = service.stopProxy();
      // レスポンスを返さず、タイムアウトを発火（3秒）
      await vi.advanceTimersByTimeAsync(3_000);
      await stopPromise;

      expect(logger.warn).toHaveBeenCalledWith(
        "MCPサーバーの正常停止に失敗、強制終了します",
        expect.objectContaining({
          error: "シャットダウンタイムアウト",
        }),
      );
      processKillSpy.mockRestore();
    });

    test("保留中のリクエストがエラーになる", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const processKillSpy = vi
        .spyOn(process, "kill")
        .mockReturnValue(true as never);

      // 保留中のリクエストを作成
      const listPromise = service.listMcpTools();
      await vi.advanceTimersByTimeAsync(0);

      // stopProxyを呼ぶ（stopリクエストに正常応答してから保留リクエストをreject）
      const stopPromise = service.stopProxy();
      await vi.advanceTimersByTimeAsync(0);
      // stopProxy内のsendRequest("stop")に応答
      respondToRequest({ ok: true }, mockProcess, 2);
      await stopPromise;

      await expect(listPromise).rejects.toThrow(
        "Proxy Processが停止されました",
      );
      processKillSpy.mockRestore();
    });
  });

  describe("リクエストタイムアウト", () => {
    test("30秒以内にレスポンスがない場合はタイムアウトエラーになる", async () => {
      const service = await importService();
      await spawnAndStart(service);

      const listPromise = service.listMcpTools();

      // タイムアウト発火（同期版を使い、unhandled rejectionを回避）
      vi.advanceTimersByTime(30_000);
      await expect(listPromise).rejects.toThrow("タイムアウトしました");
    });
  });

  describe("IPC送信失敗", () => {
    test("send()がthrowした場合はエラーを返す", async () => {
      const service = await importService();
      await spawnAndStart(service);

      // 次の send() を失敗させる
      vi.mocked(mockProcess.send!).mockImplementationOnce(() => {
        throw new Error("channel closed");
      });

      await expect(service.listMcpTools()).rejects.toThrow(
        "IPCメッセージの送信に失敗しました: channel closed",
      );
    });
  });

  describe("handleMessage", () => {
    test("不正なメッセージはログに記録される", async () => {
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      mockProcess.emit("message", null);

      expect(logger.warn).toHaveBeenCalledWith(
        "Proxy Processから不正なメッセージを受信しました",
        { msg: null },
      );
    });

    test("status-changedイベントはログに記録される", async () => {
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      mockProcess.emit("message", {
        type: "status-changed",
        payload: { name: "serena", status: "running" },
      });

      expect(logger.info).toHaveBeenCalledWith(
        "MCPサーバー状態変更",
        expect.objectContaining({ name: "serena", status: "running" }),
      );
    });

    test("対応するリクエストがないレスポンスはデバッグログに記録される", async () => {
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      mockProcess.emit("message", { id: "unknown-id", ok: true });

      expect(logger.debug).toHaveBeenCalledWith(
        "対応するリクエストがないレスポンスを受信（タイムアウト済みの可能性）",
        { id: "unknown-id" },
      );
    });

    test("未分類のメッセージはログに記録される", async () => {
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      mockProcess.emit("message", { someField: "value" });

      expect(logger.warn).toHaveBeenCalledWith(
        "Proxy Processから未分類のメッセージを受信しました",
        { msg: { someField: "value" } },
      );
    });
  });

  describe("プロセスクラッシュとリトライ", () => {
    test("プロセスが異常終了した場合、保留中のリクエストがエラーになる", async () => {
      const service = await importService();
      await spawnAndStart(service);

      // リクエストを送信（レスポンスは返さない）
      const listPromise = service.listMcpTools();
      await vi.advanceTimersByTimeAsync(0);

      // プロセスクラッシュ
      mockProcess.emit("exit", 1, null);

      await expect(listPromise).rejects.toThrow(
        "Proxy Processがクラッシュしました",
      );
    });

    test("クラッシュ後にバックオフリトライでプロセスを再起動する", async () => {
      const { fork } = await import("child_process");
      const service = await importService();
      await spawnAndStart(service);

      expect(fork).toHaveBeenCalledTimes(1);

      // リトライ用の新プロセスを準備
      const retryProcess = createMockProcess();
      vi.mocked(fork).mockReturnValueOnce(
        retryProcess as ReturnType<typeof fork>,
      );

      // プロセスクラッシュ
      mockProcess.emit("exit", 1, null);

      // 1回目のリトライ: 1000ms後
      await vi.advanceTimersByTimeAsync(1000);
      retryProcess.emit("spawn");
      await vi.advanceTimersByTimeAsync(0);

      expect(fork).toHaveBeenCalledTimes(2);

      // リトライ後のstartリクエストに応答
      respondToRequest({ ok: true, result: [] }, retryProcess);
      await vi.advanceTimersByTimeAsync(0);
    });

    test("リトライ上限（3回）に達した場合はリトライしない", async () => {
      const { fork } = await import("child_process");
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      // 3回リトライ（各リトライでspawn失敗 → processRetryCountがリセットされない）
      for (let i = 0; i < 3; i++) {
        const retryProc = createMockProcess();
        vi.mocked(fork).mockReturnValueOnce(
          retryProc as ReturnType<typeof fork>,
        );

        mockProcess.emit("exit", 1, null);

        const delay = 1000 * Math.pow(3, i);
        await vi.advanceTimersByTimeAsync(delay);
        // spawn失敗（processRetryCountがリセットされない）
        retryProc.emit("error", new Error("spawn failed"));
        await vi.advanceTimersByTimeAsync(0);

        mockProcess = retryProc;
      }

      // 4回目のクラッシュ → リトライ上限到達
      const forkCountBefore = vi.mocked(fork).mock.calls.length;
      mockProcess.emit("exit", 1, null);
      await vi.advanceTimersByTimeAsync(30_000);

      expect(vi.mocked(fork).mock.calls.length).toBe(forkCountBefore);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("リトライ上限"),
      );
    });

    test("意図的な停止時（stopProxy後）はリトライしない", async () => {
      const { fork } = await import("child_process");
      const service = await importService();
      await spawnAndStart(service);

      const processKillSpy = vi
        .spyOn(process, "kill")
        .mockReturnValue(true as never);

      // stopProxy呼び出し
      const stopPromise = service.stopProxy();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true }, mockProcess, 1);
      await stopPromise;

      const forkCount = vi.mocked(fork).mock.calls.length;

      // exit発火してもリトライしない
      mockProcess.emit("exit", 0, null);
      await vi.advanceTimersByTimeAsync(30_000);

      expect(vi.mocked(fork).mock.calls.length).toBe(forkCount);
      processKillSpy.mockRestore();
    });

    test("exit/errorの二重発火時にcrash処理が1回だけ実行される", async () => {
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      vi.mocked(logger.warn).mockClear();

      // exit + error を連続で発火
      mockProcess.emit("exit", 1, null);
      mockProcess.emit("error", new Error("process error"));

      const crashLogs = vi
        .mocked(logger.warn)
        .mock.calls.filter((call) => call[0] === "Proxy Processが終了しました");
      expect(crashLogs).toHaveLength(1);
    });

    test("世代が異なるプロセスのexitは無視される", async () => {
      const { fork } = await import("child_process");
      const logger = await import("../../../shared/utils/logger");
      const service = await importService();
      await spawnAndStart(service);

      const oldProcess = mockProcess;
      vi.mocked(logger.warn).mockClear();

      // stopProxy → 新しいstartMcpServersで世代が進む
      const processKillSpy = vi
        .spyOn(process, "kill")
        .mockReturnValue(true as never);

      const stopPromise = service.stopProxy();
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true }, mockProcess, 1);
      await stopPromise;

      // 新プロセスで再起動
      mockProcess = createMockProcess();
      vi.mocked(fork).mockReturnValueOnce(
        mockProcess as ReturnType<typeof fork>,
      );
      const startPromise = service.startMcpServers();
      mockProcess.emit("spawn");
      await vi.advanceTimersByTimeAsync(0);
      respondToRequest({ ok: true, result: [] });
      await startPromise;

      vi.mocked(logger.warn).mockClear();

      // 古いプロセスのexitイベント
      oldProcess.emit("exit", 1, null);

      // 古いプロセスのexitは無視される（ログなし）
      const crashLogs = vi
        .mocked(logger.warn)
        .mock.calls.filter((call) => call[0] === "Proxy Processが終了しました");
      expect(crashLogs).toHaveLength(0);
      processKillSpy.mockRestore();
    });
  });

  describe("spawnProxy の並列呼び出し防止", () => {
    test("同時に2回startMcpServersを呼んでもforkは1回", async () => {
      const { fork } = await import("child_process");
      const service = await importService();

      const p1 = service.startMcpServers();
      const p2 = service.startMcpServers();

      mockProcess.emit("spawn");
      await vi.advanceTimersByTimeAsync(0);

      // p1のstartリクエストに応答
      respondToRequest({ ok: true, result: [] });
      await vi.advanceTimersByTimeAsync(0);

      // p2のstartリクエストに応答
      respondToRequest({ ok: true, result: [] }, mockProcess, 1);

      await Promise.all([p1, p2]);

      expect(fork).toHaveBeenCalledTimes(1);
    });
  });

  describe("fork失敗", () => {
    test("spawnイベント前にerrorが発生した場合はthrowする", async () => {
      const service = await importService();

      const promise = service.startMcpServers();
      // spawnではなくerrorを発火
      mockProcess.emit("error", new Error("fork failed: ENOENT"));

      await expect(promise).rejects.toThrow("fork failed: ENOENT");
    });
  });
});
