import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

import type { McpServerConfig } from "../types.js";

// runMcpProxy が SIGINT/SIGTERM ハンドラを process に登録するため、
// 実 process への登録を避けるために process.on をスタブする。
// （登録されたハンドラがテスト終了後に発火し unhandled rejection を起こすのを防ぐ）
const originalProcessOn = process.on.bind(process);
const processOnSpy = vi
  .spyOn(process, "on")
  .mockImplementation((event, handler) => {
    if (event === "SIGINT" || event === "SIGTERM") {
      // シグナルハンドラの登録はスキップ
      return process;
    }
    return originalProcessOn(event, handler);
  });

afterAll(() => {
  processOnSpy.mockRestore();
});

// vi.mock の factory は hoist されるため、参照する変数は vi.hoisted で事前宣言する
const mocks = vi.hoisted(() => {
  const mockStartAll = vi.fn().mockResolvedValue(undefined);
  const mockStopAll = vi.fn().mockResolvedValue(undefined);
  const mockCore = {
    startAll: mockStartAll,
    stopAll: mockStopAll,
    start: vi.fn(),
    stop: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
    getStatus: vi.fn(),
    onStatusChange: vi.fn(),
  };
  const mockCreateProxyCore = vi.fn(() => mockCore);
  const mockCreateSingleServerCore = vi.fn(() => mockCore);
  const mockStartStdioInbound = vi.fn().mockResolvedValue(undefined);
  return {
    mockStartAll,
    mockStopAll,
    mockCore,
    mockCreateProxyCore,
    mockCreateSingleServerCore,
    mockStartStdioInbound,
  };
});

vi.mock("../core.js", () => ({
  createProxyCore: mocks.mockCreateProxyCore,
  createSingleServerCore: mocks.mockCreateSingleServerCore,
}));

vi.mock("../inbound/stdio-inbound.js", () => ({
  startStdioInbound: mocks.mockStartStdioInbound,
}));

vi.mock("../stderr-logger.js", () => ({
  stderrLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// テスト対象のインポートはモックの後に行う
const { runMcpProxy } = await import("../cli.js");

describe("runMcpProxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks は mockResolvedValue も消すため、signal ハンドラの
    // shutdown → core.stopAll() が undefined を返して unhandled rejection を
    // 起こさないように再設定する
    mocks.mockStartAll.mockResolvedValue(undefined);
    mocks.mockStopAll.mockResolvedValue(undefined);
    mocks.mockStartStdioInbound.mockResolvedValue(undefined);
  });

  test("configs が0件でも createProxyCore を使う", async () => {
    await runMcpProxy([]);

    expect(mocks.mockCreateProxyCore).toHaveBeenCalledOnce();
    expect(mocks.mockCreateProxyCore).toHaveBeenCalledWith(
      [],
      expect.any(Object),
    );
    expect(mocks.mockStartAll).toHaveBeenCalledOnce();
    expect(mocks.mockStartStdioInbound).toHaveBeenCalledWith(
      mocks.mockCore,
      expect.any(Object),
    );
  });

  test("configs が1件の場合は createSingleServerCore を使う（prefixなし）", async () => {
    const configs: McpServerConfig[] = [
      { name: "serena", command: "uvx", args: ["serena"], env: {} },
    ];
    await runMcpProxy(configs);

    // 単体サーバーはprefixなしで直接委譲（ツール名がそのまま公開される）
    expect(mocks.mockCreateSingleServerCore).toHaveBeenCalledOnce();
    expect(mocks.mockCreateSingleServerCore).toHaveBeenCalledWith(
      configs[0],
      expect.any(Object),
    );
    expect(mocks.mockCreateProxyCore).not.toHaveBeenCalled();
  });

  test("configs が2件以上でも createProxyCore を使う", async () => {
    const configs: McpServerConfig[] = [
      { name: "a", command: "echo", args: [], env: {} },
      { name: "b", command: "echo", args: [], env: {} },
    ];
    await runMcpProxy(configs);

    expect(mocks.mockCreateProxyCore).toHaveBeenCalledWith(
      configs,
      expect.any(Object),
    );
  });
});
