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
  const mockStartStdioInbound = vi.fn().mockResolvedValue(undefined);
  return {
    mockStartAll,
    mockStopAll,
    mockCore,
    mockCreateProxyCore,
    mockStartStdioInbound,
  };
});

vi.mock("../core.js", () => ({
  createProxyCore: mocks.mockCreateProxyCore,
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
    // PII マスキングフィルタが runMcpProxy 内で自動構築されるため、3引数目には常に filter が含まれる
    expect(mocks.mockStartStdioInbound).toHaveBeenCalledWith(
      mocks.mockCore,
      expect.any(Object),
      expect.objectContaining({ filter: expect.any(Object) as unknown }),
    );
  });

  test("configs が1件でも createProxyCore を使う（prefix付きツール名を保証）", async () => {
    const configs: McpServerConfig[] = [
      {
        name: "serena",
        transportType: "STDIO",
        command: "uvx",
        args: ["serena"],
        env: {},
      },
    ];
    await runMcpProxy(configs);

    // Desktop モードと同じく createProxyCore で ToolAggregator 経由の prefix 付き
    // ツール名にするため、単体サーバーでも createProxyCore を使う必要がある
    expect(mocks.mockCreateProxyCore).toHaveBeenCalledOnce();
    expect(mocks.mockCreateProxyCore).toHaveBeenCalledWith(
      configs,
      expect.any(Object),
    );
  });

  test("configs が2件以上でも createProxyCore を使う", async () => {
    const configs: McpServerConfig[] = [
      { name: "a", transportType: "STDIO", command: "echo", args: [], env: {} },
      { name: "b", transportType: "STDIO", command: "echo", args: [], env: {} },
    ];
    await runMcpProxy(configs);

    expect(mocks.mockCreateProxyCore).toHaveBeenCalledWith(
      configs,
      expect.any(Object),
    );
  });

  test("hooks を startStdioInbound に渡す（filter は内蔵で追加される）", async () => {
    const onToolCall = vi.fn();
    const hooks = { onToolCall };

    await runMcpProxy([], hooks);

    expect(mocks.mockStartStdioInbound).toHaveBeenCalledWith(
      mocks.mockCore,
      expect.any(Object),
      expect.objectContaining({
        onToolCall,
        filter: expect.any(Object) as unknown,
      }),
    );
  });

  test("呼び出し側で hooks.filter を渡せばデフォルト filter を上書きできる", async () => {
    const customFilter = {
      beforeCall: vi.fn(),
      afterCall: vi.fn(),
    };

    await runMcpProxy([], { filter: customFilter });

    expect(mocks.mockStartStdioInbound).toHaveBeenCalledWith(
      mocks.mockCore,
      expect.any(Object),
      expect.objectContaining({ filter: customFilter }),
    );
  });
});
