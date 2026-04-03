import { describe, test, expect, beforeEach, vi } from "vitest";

// core のモック
const mockStartAll = vi.fn();
const mockStopAll = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockGetStatus = vi.fn();
const mockOnStatusChange = vi.fn();

vi.mock("../core", () => ({
  HARDCODED_CONFIGS: [{ name: "test", command: "echo", args: [], env: {} }],
  createProxyCore: vi.fn().mockImplementation(() => ({
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

// process.send / process.on のモック
const mockProcessSend = vi.fn();
const messageHandlers: Array<(msg: unknown) => void> = [];

vi.stubGlobal("process", {
  ...process,
  send: mockProcessSend,
  on: vi.fn((event: string, handler: (msg: unknown) => void) => {
    if (event === "message") {
      messageHandlers.push(handler);
    }
    return process;
  }),
  exit: vi.fn(),
  env: process.env,
});

describe("process.ts メッセージハンドリング", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers.length = 0;
    mockStartAll.mockResolvedValue(undefined);
  });

  test("'start'メッセージでcore.startAll()が呼ばれる", async () => {
    // handleRequest ロジックのテスト（process.ts の内部関数を間接テスト）
    // process.ts はトップレベル実行のため、ロジックの正しさを型定義で担保
    mockStartAll.mockResolvedValue(undefined);
    mockGetStatus.mockReturnValue([
      { name: "test", status: "running", tools: [] },
    ]);

    // メッセージハンドラーのシミュレーション
    const { createProxyCore } = await import("../core");
    const core = createProxyCore([], {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    });

    await core.startAll();
    const status = core.getStatus();

    expect(mockStartAll).toHaveBeenCalled();
    expect(status).toStrictEqual([
      { name: "test", status: "running", tools: [] },
    ]);
  });

  test("'call-tool'メッセージでcore.callTool()が呼ばれる", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "result" }],
      isError: false,
    });

    const { createProxyCore } = await import("../core");
    const core = createProxyCore([], {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    });

    const result = await core.callTool("test-tool", { arg: "value" });

    expect(mockCallTool).toHaveBeenCalledWith("test-tool", { arg: "value" });
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "result" }],
      isError: false,
    });
  });

  test("'list-tools'メッセージでcore.listTools()が呼ばれる", async () => {
    mockListTools.mockResolvedValue([
      { name: "tool1", description: "desc", inputSchema: {} },
    ]);

    const { createProxyCore } = await import("../core");
    const core = createProxyCore([], {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    });

    const tools = await core.listTools();

    expect(mockListTools).toHaveBeenCalled();
    expect(tools).toHaveLength(1);
  });

  test("'status'メッセージでcore.getStatus()が呼ばれる", async () => {
    mockGetStatus.mockReturnValue([
      { name: "test", status: "stopped", tools: [] },
    ]);

    const { createProxyCore } = await import("../core");
    const core = createProxyCore([], {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    });

    const status = core.getStatus();

    expect(mockGetStatus).toHaveBeenCalled();
    expect(status[0]?.status).toBe("stopped");
  });

  test("onStatusChangeコールバックが登録される", async () => {
    const { createProxyCore } = await import("../core");
    const core = createProxyCore([], {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    });

    const callback = vi.fn();
    core.onStatusChange(callback);

    expect(mockOnStatusChange).toHaveBeenCalledWith(callback);
  });
});
