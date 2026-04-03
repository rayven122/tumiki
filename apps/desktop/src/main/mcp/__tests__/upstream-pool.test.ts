import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Logger, McpServerConfig } from "../types";
import type { UpstreamPool } from "../upstream-pool";

// UpstreamClientのモック
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockGetStatus = vi.fn();
const mockGetLastError = vi.fn();
const mockOnStatusChange = vi.fn();

vi.mock("../upstream-client", () => ({
  createUpstreamClient: vi
    .fn()
    .mockImplementation((config: McpServerConfig) => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      listTools: mockListTools,
      callTool: mockCallTool,
      getStatus: mockGetStatus,
      getName: () => config.name,
      getLastError: mockGetLastError,
      onStatusChange: mockOnStatusChange,
    })),
}));

import { createUpstreamPool } from "../upstream-pool";
import { createMockLogger } from "./test-helpers";

const createTestConfig = (name: string): McpServerConfig => ({
  name,
  command: "echo",
  args: ["hello"],
  env: {},
});

describe("UpstreamPool", () => {
  let pool: UpstreamPool;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    pool = createUpstreamPool(mockLogger);
  });

  describe("addServer", () => {
    test("サーバーを追加できる", () => {
      expect(() => pool.addServer(createTestConfig("server-1"))).not.toThrow();
    });

    test("同名のサーバーを追加するとエラーになる", () => {
      pool.addServer(createTestConfig("server-1"));
      expect(() => pool.addServer(createTestConfig("server-1"))).toThrow(
        "既に登録されています",
      );
    });
  });

  describe("startAll", () => {
    test("全UpstreamClientのconnect()が呼ばれる", async () => {
      mockConnect.mockResolvedValue(undefined);

      pool.addServer(createTestConfig("server-1"));
      pool.addServer(createTestConfig("server-2"));

      await pool.startAll();

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe("stopAll", () => {
    test("全UpstreamClientのdisconnect()が呼ばれる", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockDisconnect.mockResolvedValue(undefined);

      pool.addServer(createTestConfig("server-1"));
      pool.addServer(createTestConfig("server-2"));

      await pool.stopAll();

      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe("start (個別)", () => {
    test("指定されたサーバーのconnect()が呼ばれる", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockGetStatus.mockReturnValue("running");
      mockGetLastError.mockReturnValue(undefined);
      mockListTools.mockResolvedValue([
        { name: "tool1", description: "desc", inputSchema: {} },
      ]);

      pool.addServer(createTestConfig("server-1"));
      const state = await pool.start("server-1");

      expect(mockConnect).toHaveBeenCalledOnce();
      expect(state.name).toBe("server-1");
      expect(state.status).toBe("running");
      expect(state.tools).toHaveLength(1);
    });

    test("未登録のサーバー名でエラーになる", async () => {
      await expect(pool.start("unknown")).rejects.toThrow("登録されていません");
    });
  });

  describe("stop (個別)", () => {
    test("指定されたサーバーのdisconnect()が呼ばれる", async () => {
      mockDisconnect.mockResolvedValue(undefined);

      pool.addServer(createTestConfig("server-1"));
      await pool.stop("server-1");

      expect(mockDisconnect).toHaveBeenCalledOnce();
    });
  });

  describe("listTools", () => {
    test("全サーバーのツール一覧を集約して返す", async () => {
      mockListTools.mockResolvedValue([
        { name: "tool1", description: "desc1", inputSchema: {} },
      ]);

      pool.addServer(createTestConfig("server-1"));
      pool.addServer(createTestConfig("server-2"));

      const tools = await pool.listTools();

      expect(tools).toHaveLength(2);
      expect(mockListTools).toHaveBeenCalledTimes(2);
    });
  });

  describe("callTool", () => {
    test("ツール名から適切なサーバーに転送する", async () => {
      mockGetStatus.mockReturnValue("running");
      mockListTools.mockResolvedValue([
        { name: "tool1", description: "desc", inputSchema: {} },
      ]);
      mockCallTool.mockResolvedValue({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });

      pool.addServer(createTestConfig("server-1"));
      const result = await pool.callTool("tool1", { key: "value" });

      expect(result).toStrictEqual({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });
    });

    test("ツールが見つからない場合はエラーになる", async () => {
      mockGetStatus.mockReturnValue("running");
      mockListTools.mockResolvedValue([]);

      pool.addServer(createTestConfig("server-1"));

      await expect(pool.callTool("unknown", {})).rejects.toThrow(
        "見つかりません",
      );
    });
  });

  describe("getStatus", () => {
    test("全サーバーの状態を返す", () => {
      mockGetStatus.mockReturnValue("stopped");
      mockGetLastError.mockReturnValue(undefined);

      pool.addServer(createTestConfig("server-1"));
      const status = pool.getStatus();

      expect(status).toHaveLength(1);
      expect(status[0]).toStrictEqual({
        name: "server-1",
        status: "stopped",
        error: undefined,
        tools: [],
      });
    });
  });

  describe("onStatusChange", () => {
    test("状態変更コールバックが伝播する", () => {
      const callback = vi.fn();
      pool.onStatusChange(callback);

      pool.addServer(createTestConfig("server-1"));

      // createUpstreamClientのonStatusChangeに渡されたコールバックを取得して呼び出す
      const clientCallback = mockOnStatusChange.mock.calls[0]?.[0] as (
        name: string,
        status: string,
        error?: string,
      ) => void;
      expect(clientCallback).toBeDefined();

      clientCallback("server-1", "running");

      expect(callback).toHaveBeenCalledWith("server-1", "running", undefined);
    });
  });
});
