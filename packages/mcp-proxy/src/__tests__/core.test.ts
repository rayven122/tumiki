import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Logger } from "../types.js";
import { createProxyCore } from "../core.js";
import { createMockLogger } from "./test-helpers.js";

// UpstreamPoolのモック
const mockAddServer = vi.fn();
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
    const configs = [
      { name: "server-1", command: "echo", args: [], env: {} },
      { name: "server-2", command: "echo", args: [], env: {} },
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
