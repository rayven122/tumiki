import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Logger, McpServerConfig } from "../types.js";
import { createProxyCore, createSingleServerCore } from "../core.js";
import { createMockLogger } from "./test-helpers.js";

// UpstreamClientのモック（createSingleServerCore用）
const mockClientConnect = vi.fn();
const mockClientDisconnect = vi.fn();
const mockClientListTools = vi.fn();
const mockClientCallTool = vi.fn();
const mockClientGetStatus = vi.fn().mockReturnValue("stopped");
const mockClientGetName = vi.fn().mockReturnValue("test-server");
const mockClientGetLastError = vi.fn().mockReturnValue(undefined);
const mockClientOnStatusChange = vi.fn();

vi.mock("../outbound/upstream-client", () => ({
  createUpstreamClient: vi.fn().mockImplementation(() => ({
    connect: mockClientConnect,
    disconnect: mockClientDisconnect,
    listTools: mockClientListTools,
    callTool: mockClientCallTool,
    getStatus: mockClientGetStatus,
    getName: mockClientGetName,
    getLastError: mockClientGetLastError,
    onStatusChange: mockClientOnStatusChange,
  })),
}));

// UpstreamPoolのモック
const mockAddServer = vi.fn();
const mockUpdateServer = vi.fn();
const mockStartAll = vi.fn();
const mockStopAll = vi.fn();
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockGetStatus = vi.fn();
const mockOnStatusChange = vi.fn();
const mockGetClients = vi.fn().mockReturnValue(new Map());

vi.mock("../outbound/upstream-pool", () => ({
  createUpstreamPool: vi.fn().mockImplementation(() => ({
    addServer: mockAddServer,
    updateServer: mockUpdateServer,
    startAll: mockStartAll,
    stopAll: mockStopAll,
    start: mockStart,
    stop: mockStop,
    getStatus: mockGetStatus,
    getClients: mockGetClients,
    onStatusChange: mockOnStatusChange,
  })),
}));

// ToolAggregatorのモック
const mockListTools = vi.fn();
const mockCallTool = vi.fn();

vi.mock("../outbound/tool-aggregator", () => ({
  createToolAggregator: vi.fn().mockImplementation(() => ({
    listTools: mockListTools,
    callTool: mockCallTool,
  })),
}));

describe("createProxyCore", () => {
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
  });

  test("Poolを正しく初期化する", () => {
    const configs: McpServerConfig[] = [
      {
        name: "server-1",
        transportType: "STDIO",
        command: "echo",
        args: [],
        env: {},
      },
      {
        name: "server-2",
        transportType: "STDIO",
        command: "echo",
        args: [],
        env: {},
      },
    ];

    createProxyCore(configs, mockLogger);

    expect(mockAddServer).toHaveBeenCalledTimes(2);
    expect(mockAddServer).toHaveBeenCalledWith(configs[0]);
    expect(mockAddServer).toHaveBeenCalledWith(configs[1]);
  });

  test("listTools()がAggregator経由でツール一覧を返す", async () => {
    mockListTools.mockResolvedValue([
      {
        name: "serena__tool1",
        description: "desc",
        inputSchema: {},
        serverName: "serena",
      },
    ]);

    const core = createProxyCore([], mockLogger);
    const tools = await core.listTools();

    expect(mockListTools).toHaveBeenCalledOnce();
    expect(tools).toHaveLength(1);
  });

  test("callTool()がAggregator経由で正しいサーバーに転送する", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });

    const core = createProxyCore([], mockLogger);
    const result = await core.callTool("serena__tool1", { key: "value" });

    expect(mockCallTool).toHaveBeenCalledWith("serena__tool1", {
      key: "value",
    });
    expect(result.content).toHaveLength(1);
  });

  test("startAll()がPool.startAll()を呼ぶ", async () => {
    mockStartAll.mockResolvedValue(undefined);

    const core = createProxyCore([], mockLogger);
    await core.startAll();

    expect(mockStartAll).toHaveBeenCalledOnce();
  });

  test("stopAll()がPool.stopAll()を呼ぶ", async () => {
    mockStopAll.mockResolvedValue(undefined);

    const core = createProxyCore([], mockLogger);
    await core.stopAll();

    expect(mockStopAll).toHaveBeenCalledOnce();
  });

  test("getStatus()がPool.getStatus()を呼ぶ", () => {
    mockGetStatus.mockReturnValue([
      { name: "server-1", status: "running", tools: [] },
    ]);

    const core = createProxyCore([], mockLogger);
    const status = core.getStatus();

    expect(mockGetStatus).toHaveBeenCalledOnce();
    expect(status).toHaveLength(1);
  });

  test("onStatusChange()がPool.onStatusChange()を呼ぶ", () => {
    const callback = vi.fn();

    const core = createProxyCore([], mockLogger);
    core.onStatusChange(callback);

    expect(mockOnStatusChange).toHaveBeenCalledWith(callback);
  });
});

describe("createSingleServerCore", () => {
  const testConfig: McpServerConfig = {
    name: "test-server",
    transportType: "STDIO",
    command: "echo",
    args: [],
    env: {},
  };
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockClientGetStatus.mockReturnValue("stopped");
    mockClientGetLastError.mockReturnValue(undefined);
  });

  test("startAll()がUpstreamClient.connect()を呼ぶ", async () => {
    mockClientConnect.mockResolvedValue(undefined);

    const core = createSingleServerCore(testConfig, mockLogger);
    await core.startAll();

    expect(mockClientConnect).toHaveBeenCalledOnce();
  });

  test("stopAll()がUpstreamClient.disconnect()を呼ぶ", async () => {
    mockClientDisconnect.mockResolvedValue(undefined);

    const core = createSingleServerCore(testConfig, mockLogger);
    await core.stopAll();

    expect(mockClientDisconnect).toHaveBeenCalledOnce();
  });

  test("listTools()がprefixなしでツール一覧を返す", async () => {
    mockClientListTools.mockResolvedValue([
      { name: "find_file", description: "ファイル検索", inputSchema: {} },
    ]);

    const core = createSingleServerCore(testConfig, mockLogger);
    const tools = await core.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("find_file");
  });

  test("callTool()がprefixなしで直接転送する", async () => {
    mockClientCallTool.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });

    const core = createSingleServerCore(testConfig, mockLogger);
    const result = await core.callTool("find_file", { path: "." });

    expect(mockClientCallTool).toHaveBeenCalledWith("find_file", { path: "." });
    expect(result.content).toHaveLength(1);
  });

  test("getStatus()が単一サーバーの状態を返す", () => {
    mockClientGetStatus.mockReturnValue("running");

    const core = createSingleServerCore(testConfig, mockLogger);
    const status = core.getStatus();

    expect(status).toHaveLength(1);
    expect(status[0]).toStrictEqual({
      name: "test-server",
      status: "running",
      error: undefined,
      tools: [],
    });
  });

  test("start()が未登録サーバー名でエラーをスローする", async () => {
    const core = createSingleServerCore(testConfig, mockLogger);

    await expect(core.start("unknown")).rejects.toThrow(
      'サーバー "unknown" は登録されていません',
    );
  });

  test("stop()が未登録サーバー名でエラーをスローする", async () => {
    const core = createSingleServerCore(testConfig, mockLogger);

    await expect(core.stop("unknown")).rejects.toThrow(
      'サーバー "unknown" は登録されていません',
    );
  });

  test("onStatusChange()がUpstreamClient.onStatusChange()を呼ぶ", () => {
    const callback = vi.fn();

    const core = createSingleServerCore(testConfig, mockLogger);
    core.onStatusChange(callback);

    expect(mockClientOnStatusChange).toHaveBeenCalledWith(callback);
  });
});
