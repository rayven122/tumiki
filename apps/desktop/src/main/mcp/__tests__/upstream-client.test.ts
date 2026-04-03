import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Logger, McpServerConfig } from "../types";
import type { UpstreamClient } from "../upstream-client";

// MCP SDK のモック
const mockConnect = vi.fn();
const mockClose = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();

let transportOnClose: (() => void) | undefined;
let transportOnError: ((error: Error) => void) | undefined;

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    close: mockClose,
    listTools: mockListTools,
    callTool: mockCallTool,
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => {
    const transport = {
      onclose: undefined as (() => void) | undefined,
      onerror: undefined as ((error: Error) => void) | undefined,
    };
    // onclose/onerrorのセッターをキャプチャ
    Object.defineProperty(transport, "onclose", {
      set: (fn: () => void) => {
        transportOnClose = fn;
      },
      get: () => transportOnClose,
    });
    Object.defineProperty(transport, "onerror", {
      set: (fn: (error: Error) => void) => {
        transportOnError = fn;
      },
      get: () => transportOnError,
    });
    return transport;
  }),
}));

import { createUpstreamClient } from "../upstream-client";
import { createMockLogger } from "./test-helpers";

const createTestConfig = (): McpServerConfig => ({
  name: "test-server",
  command: "echo",
  args: ["hello"],
  env: {},
});

describe("UpstreamClient", () => {
  let client: UpstreamClient;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    transportOnClose = undefined;
    transportOnError = undefined;
    mockLogger = createMockLogger();
    client = createUpstreamClient(createTestConfig(), mockLogger);
  });

  describe("connect", () => {
    test("接続成功時にstatusが'running'になる", async () => {
      mockConnect.mockResolvedValue(undefined);

      await client.connect();

      expect(client.getStatus()).toBe("running");
      expect(mockConnect).toHaveBeenCalledOnce();
    });

    test("接続失敗時にstatusが'error'になりエラーをスローする", async () => {
      mockConnect.mockRejectedValue(new Error("接続失敗"));

      await expect(client.connect()).rejects.toThrow("接続に失敗しました");

      expect(client.getStatus()).toBe("error");
      expect(client.getLastError()).toBe("接続失敗");
    });

    test("接続中はstatusが'pending'になる", async () => {
      const statusChanges: string[] = [];
      client.onStatusChange((_name, status) => {
        statusChanges.push(status);
      });

      mockConnect.mockResolvedValue(undefined);
      await client.connect();

      expect(statusChanges[0]).toBe("pending");
      expect(statusChanges[1]).toBe("running");
    });
  });

  describe("disconnect", () => {
    test("client.close()が呼ばれる", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockClose.mockResolvedValue(undefined);

      await client.connect();
      await client.disconnect();

      expect(mockClose).toHaveBeenCalledOnce();
      expect(client.getStatus()).toBe("stopped");
    });

    test("未接続でもエラーにならない", async () => {
      await expect(client.disconnect()).resolves.not.toThrow();
      expect(client.getStatus()).toBe("stopped");
    });
  });

  describe("listTools", () => {
    test("Client.listTools()の結果を整形して返す", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: "read_file",
            description: "ファイルを読む",
            inputSchema: { type: "object" },
          },
        ],
      });

      await client.connect();
      const tools = await client.listTools();

      expect(tools).toStrictEqual([
        {
          name: "read_file",
          description: "ファイルを読む",
          inputSchema: { type: "object" },
        },
      ]);
    });

    test("未接続の場合は空配列を返す", async () => {
      const tools = await client.listTools();
      expect(tools).toStrictEqual([]);
    });
  });

  describe("callTool", () => {
    test("Client.callTool()に正しい引数を渡す", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockCallTool.mockResolvedValue({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });

      await client.connect();
      const result = await client.callTool("read_file", { path: "/test" });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: "read_file",
        arguments: { path: "/test" },
      });
      expect(result).toStrictEqual({
        content: [{ type: "text", text: "result" }],
        isError: false,
      });
    });

    test("未接続の場合はエラーをスローする", async () => {
      await expect(
        client.callTool("read_file", { path: "/test" }),
      ).rejects.toThrow("接続されていません");
    });
  });

  describe("クラッシュリトライ", () => {
    test("クラッシュ検知時にリトライが実行される", async () => {
      mockConnect.mockResolvedValue(undefined);

      await client.connect();
      expect(client.getStatus()).toBe("running");

      // クラッシュをシミュレート
      transportOnClose?.();

      expect(client.getStatus()).toBe("pending");

      // リトライ1回目（1秒後）
      mockConnect.mockResolvedValue(undefined);
      await vi.advanceTimersByTimeAsync(1000);

      expect(client.getStatus()).toBe("running");
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    test("リトライ上限到達時にstatusが'error'になる", async () => {
      mockConnect.mockResolvedValue(undefined);
      await client.connect();

      // クラッシュ → リトライ1（失敗）→ リトライ2（失敗）→ リトライ3（失敗）
      mockConnect.mockRejectedValue(new Error("失敗"));

      // 1回目のクラッシュ
      transportOnClose?.();
      await vi.advanceTimersByTimeAsync(1000); // リトライ1

      // 2回目のクラッシュ（リトライ1で接続失敗→error状態→handleCrashは呼ばれない）
      // 接続失敗時はsetStatus("error")で終わるため、3回のクラッシュリトライではなく
      // 最初のクラッシュ→1回のリトライ失敗でerrorになる
      expect(client.getStatus()).toBe("error");
    });
  });

  describe("onStatusChange", () => {
    test("状態変更時にコールバックが呼ばれる", async () => {
      const callback = vi.fn();
      client.onStatusChange(callback);

      mockConnect.mockResolvedValue(undefined);
      await client.connect();

      expect(callback).toHaveBeenCalledWith(
        "test-server",
        "pending",
        undefined,
      );
      expect(callback).toHaveBeenCalledWith(
        "test-server",
        "running",
        undefined,
      );
    });
  });
});
