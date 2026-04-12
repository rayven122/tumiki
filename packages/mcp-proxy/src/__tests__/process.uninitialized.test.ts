/**
 * process.ts の「start 前（core 未初期化）」の振る舞いを検証する独立テスト。
 *
 * process.ts はモジュールスコープで `core: ProxyCore | null` を保持するため、
 * 一度でも start を通したテストからは未初期化状態に戻せない。
 * そのため process.test.ts とは別ファイルに分離し、
 * モジュールを新鮮にロードして start 前の各リクエストを検証する。
 */
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

// core のモック（process.test.ts と同等）
const mockStartAll = vi.fn().mockResolvedValue(undefined);
const mockStopAll = vi.fn().mockResolvedValue(undefined);
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockGetStatus = vi.fn();
const mockOnStatusChange = vi.fn();

vi.mock("../core", () => ({
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

const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("process.ts — core 未初期化時の振る舞い", () => {
  beforeAll(async () => {
    // resetModules で process.ts を新鮮にロードし直す
    // （モジュールスコープの `core: ProxyCore | null` が null の状態を作るため）
    vi.resetModules();
    await import("../process.js");
    await flushPromises();
    mockProcessSend.mockClear();
  });

  test("list-tools を送ると 'ProxyCoreが初期化されていません' エラーが返る", async () => {
    messageHandler!({ id: "req-1", type: "list-tools" });
    await flushPromises();

    expect(mockProcessSend).toHaveBeenCalledWith({
      id: "req-1",
      ok: false,
      error: "ProxyCoreが初期化されていません",
    });
    expect(mockListTools).not.toHaveBeenCalled();
  });

  test("call-tool を送ると 'ProxyCoreが初期化されていません' エラーが返る", async () => {
    mockProcessSend.mockClear();
    messageHandler!({
      id: "req-2",
      type: "call-tool",
      payload: { name: "test__tool", arguments: {} },
    });
    await flushPromises();

    expect(mockProcessSend).toHaveBeenCalledWith({
      id: "req-2",
      ok: false,
      error: "ProxyCoreが初期化されていません",
    });
    expect(mockCallTool).not.toHaveBeenCalled();
  });

  test("stop を送ると ok: true だけが返る（no-op）", async () => {
    mockProcessSend.mockClear();
    messageHandler!({ id: "req-3", type: "stop" });
    await flushPromises();

    expect(mockProcessSend).toHaveBeenCalledWith({
      id: "req-3",
      ok: true,
    });
    expect(mockStopAll).not.toHaveBeenCalled();
  });

  test("status を送ると空配列が返る", async () => {
    mockProcessSend.mockClear();
    messageHandler!({ id: "req-4", type: "status" });
    await flushPromises();

    expect(mockProcessSend).toHaveBeenCalledWith({
      id: "req-4",
      ok: true,
      result: [],
    });
    expect(mockGetStatus).not.toHaveBeenCalled();
  });
});
