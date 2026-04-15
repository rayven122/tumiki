import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { UpstreamClient } from "../outbound/upstream-client.js";
import type { Logger, McpServerConfig, ServerStatus } from "../types.js";
import { createUpstreamClient } from "../outbound/upstream-client.js";
import { createMockLogger } from "./test-helpers.js";

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

/**
 * onclose/onerrorをキャプチャするモックトランスポートを生成
 */
const createMockTransport = () => {
  const transport = {
    onclose: undefined as (() => void) | undefined,
    onerror: undefined as ((error: Error) => void) | undefined,
  };
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
};

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => createMockTransport()),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => createMockTransport()),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi
    .fn()
    .mockImplementation(() => createMockTransport()),
}));

const createTestConfig = (): McpServerConfig => ({
  name: "test-server",
  transportType: "STDIO",
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

  afterEach(() => {
    vi.useRealTimers();
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
      client.onStatusChange((_name: string, status: ServerStatus) => {
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

    test("未接続の場合はエラーをスローする", async () => {
      await expect(client.listTools()).rejects.toThrow(
        "未接続のためツール一覧を取得できません",
      );
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

    test("リトライ上限（3回）到達時にstatusが'error'になる", async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await client.connect();
      expect(client.getStatus()).toBe("running");

      // 以降の接続は全て失敗
      mockConnect.mockRejectedValue(new Error("失敗"));

      // クラッシュをシミュレート
      transportOnClose?.();
      expect(client.getStatus()).toBe("pending");

      // リトライ1（1秒後）→ 失敗 → まだpending
      await vi.advanceTimersByTimeAsync(1000);
      expect(client.getStatus()).toBe("pending");

      // リトライ2（3秒後）→ 失敗 → まだpending
      await vi.advanceTimersByTimeAsync(3000);
      expect(client.getStatus()).toBe("pending");

      // リトライ3（9秒後）→ 失敗 → error
      await vi.advanceTimersByTimeAsync(9000);
      expect(client.getStatus()).toBe("error");

      // 初回接続(1) + リトライ(3) = 4回
      expect(mockConnect).toHaveBeenCalledTimes(4);
    });

    test("リトライ中に接続成功するとstatusが'running'に復帰する", async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await client.connect();

      // 1回目のリトライで復旧
      mockConnect
        .mockRejectedValueOnce(new Error("失敗"))
        .mockResolvedValueOnce(undefined);

      transportOnClose?.();
      expect(client.getStatus()).toBe("pending");

      // リトライ1（1秒後）→ 失敗 → pending継続
      await vi.advanceTimersByTimeAsync(1000);
      expect(client.getStatus()).toBe("pending");

      // リトライ2（3秒後）→ 成功 → running
      await vi.advanceTimersByTimeAsync(3000);
      expect(client.getStatus()).toBe("running");
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

  describe("createTransport（トランスポート生成）", () => {
    test("STDIO設定でStdioClientTransportが生成される", async () => {
      mockConnect.mockResolvedValue(undefined);
      await client.connect();

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: "echo",
        args: ["hello"],
        env: expect.objectContaining({}) as unknown,
      });
    });

    test("SSE設定でSSEClientTransportが生成される", async () => {
      const sseConfig: McpServerConfig = {
        name: "sse-server",
        transportType: "SSE",
        url: "http://localhost:3000/sse",
        authType: "BEARER",
        headers: { Authorization: "Bearer test-token" },
      };
      const sseClient = createUpstreamClient(sseConfig, mockLogger);
      mockConnect.mockResolvedValue(undefined);

      await sseClient.connect();

      expect(SSEClientTransport).toHaveBeenCalledWith(
        new URL("http://localhost:3000/sse"),
        expect.objectContaining({
          requestInit: { headers: { Authorization: "Bearer test-token" } },
          eventSourceInit: expect.objectContaining({
            fetch: expect.any(Function) as unknown,
          }) as unknown,
        }),
      );
    });

    test("SSEのeventSourceInit.fetchがカスタムヘッダーを注入する", async () => {
      const sseConfig: McpServerConfig = {
        name: "sse-server",
        transportType: "SSE",
        url: "http://localhost:3000/sse",
        authType: "BEARER",
        headers: { Authorization: "Bearer injected" },
      };
      const sseClient = createUpstreamClient(sseConfig, mockLogger);
      mockConnect.mockResolvedValue(undefined);

      // connect()を呼んでcreateTransport()を実行させる
      await sseClient.connect();

      // SSEClientTransportに渡されたeventSourceInit.fetchを取得
      const constructorCall = vi.mocked(SSEClientTransport).mock.calls[0] as
        | [
            URL,
            {
              eventSourceInit: {
                fetch: (
                  url: string | URL,
                  init?: RequestInit,
                ) => Promise<Response>;
              };
            },
          ]
        | undefined;
      const options = constructorCall?.[1];
      if (!options) throw new Error("SSEClientTransportが呼び出されていません");
      const customFetch = options.eventSourceInit.fetch;

      // カスタムfetchがヘッダーをマージすることを検証
      const mockFetchFn = vi.fn().mockResolvedValue(new Response());
      vi.stubGlobal("fetch", mockFetchFn);

      await customFetch("http://localhost:3000/sse", {
        headers: { "Content-Type": "text/event-stream" },
      });

      expect(mockFetchFn).toHaveBeenCalledWith("http://localhost:3000/sse", {
        headers: {
          "Content-Type": "text/event-stream",
          Authorization: "Bearer injected",
        },
      });

      vi.unstubAllGlobals();
    });

    test("STREAMABLE_HTTP設定でStreamableHTTPClientTransportが生成される", async () => {
      const httpConfig: McpServerConfig = {
        name: "http-server",
        transportType: "STREAMABLE_HTTP",
        url: "http://localhost:3000/mcp",
        authType: "NONE",
        headers: {},
      };
      const httpClient = createUpstreamClient(httpConfig, mockLogger);
      mockConnect.mockResolvedValue(undefined);

      await httpClient.connect();

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL("http://localhost:3000/mcp"),
        { requestInit: { headers: {} } },
      );
    });
  });
});
