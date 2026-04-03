import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Logger } from "../types.js";
import { createProxyCore, HARDCODED_CONFIGS } from "../core.js";
import { createMockLogger } from "./test-helpers.js";

// UpstreamPoolのモック
const mockAddServer = vi.fn();
const mockStartAll = vi.fn();
const mockStopAll = vi.fn();
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockGetStatus = vi.fn();
const mockOnStatusChange = vi.fn();

vi.mock("../outbound/upstream-pool", () => ({
  createUpstreamPool: vi.fn().mockImplementation(() => ({
    addServer: mockAddServer,
    startAll: mockStartAll,
    stopAll: mockStopAll,
    start: mockStart,
    stop: mockStop,
    listTools: mockListTools,
    callTool: mockCallTool,
    getStatus: mockGetStatus,
    onStatusChange: mockOnStatusChange,
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

  test("listTools()がPool経由でツール一覧を返す", async () => {
    mockListTools.mockResolvedValue([
      { name: "tool1", description: "desc", inputSchema: {} },
    ]);

    const core = createProxyCore([], mockLogger);
    const tools = await core.listTools();

    expect(mockListTools).toHaveBeenCalledOnce();
    expect(tools).toHaveLength(1);
  });

  test("callTool()がPool経由で正しいサーバーに転送する", async () => {
    mockCallTool.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      isError: false,
    });

    const core = createProxyCore([], mockLogger);
    const result = await core.callTool("tool1", { key: "value" });

    expect(mockCallTool).toHaveBeenCalledWith("tool1", { key: "value" });
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

describe("HARDCODED_CONFIGS", () => {
  test("Serena MCPの設定が含まれている", () => {
    expect(HARDCODED_CONFIGS).toHaveLength(1);
    expect(HARDCODED_CONFIGS[0]).toStrictEqual({
      name: "serena",
      command: "uvx",
      args: [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--enable-web-dashboard",
        "false",
        "--context",
        "ide-assistant",
        "--project",
        ".",
      ],
      env: {},
    });
  });
});
