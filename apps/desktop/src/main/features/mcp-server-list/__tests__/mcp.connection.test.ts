import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));

// MCP SDKのモック
const mockConnect = vi.fn();
const mockListTools = vi.fn();
const mockClose = vi.fn();

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  return {
    Client: class {
      connect = mockConnect;
      listTools = mockListTools;
      close = mockClose;
    },
  };
});

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock("../../../shared/utils/logger");

import { listToolsHTTP, listToolsSSE } from "../mcp.connection";

describe("mcp.connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockTools = [
    {
      name: "search",
      description: "検索ツール",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    },
    {
      name: "fetch",
      description: "取得ツール",
      inputSchema: {},
    },
  ];

  describe("listToolsHTTP", () => {
    test("Streamable HTTPサーバーからツール一覧を取得する", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: mockTools });

      const result = await listToolsHTTP("https://example.com/mcp", {
        "X-API-Key": "test-key",
      });

      expect(result).toStrictEqual([
        {
          name: "search",
          description: "検索ツール",
          inputSchema: JSON.stringify({
            type: "object",
            properties: { query: { type: "string" } },
          }),
        },
        {
          name: "fetch",
          description: "取得ツール",
          inputSchema: "{}",
        },
      ]);
      expect(mockClose).toHaveBeenCalled();
    });

    test("接続失敗時にエラーをthrowしcloseを呼ぶ", async () => {
      mockConnect.mockRejectedValue(new Error("Connection refused"));

      await expect(
        listToolsHTTP("https://example.com/mcp", { "X-API-Key": "bad-key" }),
      ).rejects.toThrow("Connection refused");
      expect(mockClose).toHaveBeenCalled();
    });

    test("タイムアウト発生時にエラーをthrowする", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });

      mockConnect.mockImplementation(
        () => new Promise(() => {}), // 永遠に解決しない
      );

      const promise = listToolsHTTP("https://example.com/mcp", {
        "X-API-Key": "test-key",
      });

      // unhandled rejection警告を抑制（Promise.race内部のタイミング問題）
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(10_000);

      await expect(promise).rejects.toThrow(
        "MCPサーバーへの接続がタイムアウトしました（10秒）",
      );
      expect(mockClose).toHaveBeenCalled();
    });

    test("descriptionが未定義のツールは空文字になる", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({
        tools: [{ name: "tool1" }],
      });

      const result = await listToolsHTTP("https://example.com/mcp", {});

      expect(result).toStrictEqual([
        { name: "tool1", description: "", inputSchema: "{}" },
      ]);
    });
  });

  describe("listToolsSSE", () => {
    test("SSEサーバーからツール一覧を取得する", async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: mockTools });

      const result = await listToolsSSE("https://example.com/sse", {
        Authorization: "Bearer test-token",
      });

      expect(result).toStrictEqual([
        {
          name: "search",
          description: "検索ツール",
          inputSchema: JSON.stringify({
            type: "object",
            properties: { query: { type: "string" } },
          }),
        },
        {
          name: "fetch",
          description: "取得ツール",
          inputSchema: "{}",
        },
      ]);
      expect(mockClose).toHaveBeenCalled();
    });

    test("接続失敗時にエラーをthrowしcloseを呼ぶ", async () => {
      mockConnect.mockRejectedValue(new Error("SSE connection failed"));

      await expect(listToolsSSE("https://example.com/sse", {})).rejects.toThrow(
        "SSE connection failed",
      );
      expect(mockClose).toHaveBeenCalled();
    });

    test("タイムアウト発生時にエラーをthrowする", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });

      mockConnect.mockImplementation(
        () => new Promise(() => {}), // 永遠に解決しない
      );

      const promise = listToolsSSE("https://example.com/sse", {
        Authorization: "Bearer test-token",
      });

      // unhandled rejection警告を抑制（Promise.race内部のタイミング問題）
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(10_000);

      await expect(promise).rejects.toThrow(
        "MCPサーバーへの接続がタイムアウトしました（10秒）",
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
