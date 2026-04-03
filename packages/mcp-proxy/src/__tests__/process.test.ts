import { describe, test, expect, beforeAll, beforeEach, vi } from "vitest";

// core のモック
const mockStartAll = vi.fn().mockResolvedValue(undefined);
const mockStopAll = vi.fn().mockResolvedValue(undefined);
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockGetStatus = vi.fn();
const mockOnStatusChange = vi.fn();

vi.mock("../core", () => ({
  HARDCODED_CONFIGS: [{ name: "test", command: "echo", args: [], env: {} }],
  createProxyCore: vi.fn(() => ({
    startAll: mockStartAll,
    stopAll: mockStopAll,
    start: vi.fn(),
    stop: vi.fn(),
    listTools: mockListTools,
    callTool: mockCallTool,
    getStatus: mockGetStatus,
    onStatusChange: mockOnStatusChange,
  })),
}));

vi.mock("../stderr-logger", () => ({
  stderrLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// process.send / process.on のモック
const mockProcessSend = vi.fn();
let messageHandler: ((msg: unknown) => void) | undefined;

vi.stubGlobal("process", {
  ...process,
  send: mockProcessSend,
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (event === "message") {
      messageHandler = handler as (msg: unknown) => void;
    }
    return process;
  }),
  exit: vi.fn(),
  env: process.env,
});

// Promise flushヘルパー
const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("process.ts", () => {
  beforeAll(async () => {
    // process.tsをインポート → main()が実行される
    await import("../process.js");
    // main()のPromise解決を待つ
    await flushPromises();
  });

  describe("初期化", () => {
    test("起動時にcore.startAll()が呼ばれる", () => {
      expect(mockStartAll).toHaveBeenCalled();
    });

    test("onStatusChangeコールバックが登録される", () => {
      expect(mockOnStatusChange).toHaveBeenCalled();
    });

    test("メッセージハンドラーが登録される", () => {
      expect(messageHandler).toBeDefined();
    });
  });

  describe("メッセージハンドリング", () => {
    beforeEach(() => {
      mockProcessSend.mockClear();
    });

    test("'start'メッセージでcore.startAll()が呼ばれレスポンスが返る", async () => {
      mockStartAll.mockResolvedValue(undefined);
      mockGetStatus.mockReturnValue([
        { name: "test", status: "running", tools: [] },
      ]);

      messageHandler!({ id: "req-1", type: "start" });
      await flushPromises();

      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-1",
        ok: true,
        result: [{ name: "test", status: "running", tools: [] }],
      });
    });

    test("'stop'メッセージでcore.stopAll()が呼ばれる", async () => {
      mockStopAll.mockResolvedValue(undefined);

      messageHandler!({ id: "req-2", type: "stop" });
      await flushPromises();

      expect(mockStopAll).toHaveBeenCalled();
      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-2",
        ok: true,
      });
    });

    test("'list-tools'メッセージでcore.listTools()が呼ばれる", async () => {
      mockListTools.mockResolvedValue([
        { name: "tool1", description: "desc", inputSchema: {} },
      ]);

      messageHandler!({ id: "req-3", type: "list-tools" });
      await flushPromises();

      expect(mockListTools).toHaveBeenCalled();
      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-3",
        ok: true,
        result: [{ name: "tool1", description: "desc", inputSchema: {} }],
      });
    });

    test("'call-tool'メッセージでcore.callTool()に正しい引数が渡される", async () => {
      mockCallTool.mockResolvedValue({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });

      messageHandler!({
        id: "req-4",
        type: "call-tool",
        payload: { name: "test-tool", arguments: { arg: "value" } },
      });
      await flushPromises();

      expect(mockCallTool).toHaveBeenCalledWith("test-tool", { arg: "value" });
      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-4",
        ok: true,
        result: {
          content: [{ type: "text", text: "result" }],
          isError: false,
        },
      });
    });

    test("'status'メッセージでcore.getStatus()が呼ばれる", async () => {
      mockGetStatus.mockReturnValue([
        { name: "test", status: "stopped", tools: [] },
      ]);

      messageHandler!({ id: "req-5", type: "status" });
      await flushPromises();

      expect(mockGetStatus).toHaveBeenCalled();
      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-5",
        ok: true,
        result: [{ name: "test", status: "stopped", tools: [] }],
      });
    });

    test("不明なtypeでエラーレスポンスが返る", async () => {
      messageHandler!({ id: "req-6", type: "unknown-type" });
      await flushPromises();

      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-6",
        ok: false,
        error: expect.stringContaining("不明なリクエストタイプ"),
      });
    });

    test("不正なメッセージ（id/type欠落）は無視される", async () => {
      messageHandler!("invalid");
      messageHandler!(null);
      messageHandler!({ noId: true });

      await flushPromises();

      expect(mockProcessSend).not.toHaveBeenCalled();
    });

    test("リクエスト処理中のエラーでエラーレスポンスが返る", async () => {
      mockStartAll.mockRejectedValue(new Error("起動エラー"));

      messageHandler!({ id: "req-7", type: "start" });
      await flushPromises();

      expect(mockProcessSend).toHaveBeenCalledWith({
        id: "req-7",
        ok: false,
        error: "起動エラー",
      });
    });
  });

  describe("状態変更通知", () => {
    beforeEach(() => {
      mockProcessSend.mockClear();
    });

    test("状態変更がprocess.send経由でMainに通知される", () => {
      // onStatusChangeに渡されたコールバックを取得
      const statusCallback = mockOnStatusChange.mock.calls[0]?.[0] as (
        name: string,
        status: string,
        error?: string,
      ) => void;
      expect(statusCallback).toBeDefined();

      statusCallback("test-server", "error", "接続エラー");

      expect(mockProcessSend).toHaveBeenCalledWith({
        type: "status-changed",
        payload: {
          name: "test-server",
          status: "error",
          error: "接続エラー",
        },
      });
    });
  });
});
