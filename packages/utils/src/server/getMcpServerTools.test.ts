import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@prisma/client";
// Client import is used in module mocking below
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getMcpServerTools, getMcpServerToolsSSE } from "./getMcpServerTools";

// モックの定義
const mockClient = {
  connect: vi.fn(),
  listTools: vi.fn(),
  close: vi.fn(),
};

// モジュールのモック
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => mockClient),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(),
}));

describe("getMcpServerTools", () => {
  const mockTools: Tool[] = [
    {
      name: "tool1",
      description: "Tool 1 description",
      inputSchema: {
        type: "object",
        properties: {
          param1: { type: "string" },
        },
      },
    },
    {
      name: "tool2",
      description: "Tool 2 description",
      inputSchema: {
        type: "object",
        properties: {
          param2: { type: "number" },
        },
      },
    },
  ];

  const mockServer: McpServer = {
    id: "server-id",
    name: "test-server",
    iconPath: null,
    transportType: "STDIO",
    command: "node",
    args: ["--version"],
    url: null,
    envVars: [],
    authType: "NONE",
    serverType: "OFFICIAL",
    visibility: "PRIVATE",
    oauthProvider: null,
    oauthScopes: [],
    createdBy: null,
    organizationId: null,
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEnvVars = {
    API_KEY: "test-api-key",
    SECRET: "test-secret",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {
      // Mock console.error to prevent test output noise
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("正常系: STDIOトランスポートでツール一覧を取得する", async () => {
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerTools(mockServer, mockEnvVars);

    expect(result).toStrictEqual(mockTools);
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.listTools).toHaveBeenCalledTimes(1);
    expect(mockClient.close).toHaveBeenCalledTimes(1);

    expect(StdioClientTransport).toHaveBeenCalledWith({
      command: process.execPath,
      args: ["--version"],
      env: mockEnvVars,
    });
  });

  test("正常系: STDIOトランスポートでカスタムコマンドを使用する", async () => {
    const customServer = { ...mockServer, command: "python" };
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerTools(customServer, mockEnvVars);

    expect(result).toStrictEqual(mockTools);

    expect(StdioClientTransport).toHaveBeenCalledWith({
      command: "python",
      args: ["--version"],
      env: mockEnvVars,
    });
  });

  test("正常系: SSEトランスポートでツール一覧を取得する", async () => {
    const sseServer = {
      ...mockServer,
      transportType: "SSE" as const,
      url: "https://example.com/mcp",
    };
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerTools(sseServer, mockEnvVars);

    expect(result).toStrictEqual(mockTools);
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.listTools).toHaveBeenCalledTimes(1);
    expect(mockClient.close).toHaveBeenCalledTimes(1);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      new URL("https://example.com/mcp"),
      {
        requestInit: { headers: mockEnvVars },
      },
    );
  });

  test("正常系: 空のツール一覧を返す", async () => {
    mockClient.listTools.mockResolvedValue({ tools: [] });

    const result = await getMcpServerTools(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
  });

  test("異常系: 接続エラーが発生した場合に空配列を返す", async () => {
    mockClient.connect.mockRejectedValue(new Error("Connection failed"));

    const result = await getMcpServerTools(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Connection failed",
      }),
    );
    expect(mockClient.close).not.toHaveBeenCalled();
  });

  test("異常系: ツール一覧取得でエラーが発生した場合に空配列を返す", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockRejectedValue(new Error("List tools failed"));

    const result = await getMcpServerTools(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "List tools failed",
      }),
    );
    expect(mockClient.close).not.toHaveBeenCalled();
  });

  test("異常系: クローズ処理でエラーが発生した場合でも空配列を返す", async () => {
    mockClient.listTools.mockResolvedValue({ tools: mockTools });
    mockClient.close.mockRejectedValue(new Error("Close failed"));

    const result = await getMcpServerTools(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Close failed",
      }),
    );
  });

  test("境界値: commandがnullの場合に空文字列を使用する", async () => {
    const nullCommandServer = { ...mockServer, command: null };
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    await getMcpServerTools(nullCommandServer, mockEnvVars);

    expect(StdioClientTransport).toHaveBeenCalledWith({
      command: "",
      args: ["--version"],
      env: mockEnvVars,
    });
  });

  test("境界値: urlがnullの場合にURL作成でエラーが発生し空配列を返す", async () => {
    const nullUrlServer = {
      ...mockServer,
      transportType: "SSE" as const,
      url: null,
    };
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerTools(nullUrlServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalled();
    expect(SSEClientTransport).not.toHaveBeenCalled();
  });
});

describe("getMcpServerToolsSSE", () => {
  const mockTools: Tool[] = [
    {
      name: "sse-tool1",
      description: "SSE Tool 1",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
      },
    },
  ];

  const mockServer = {
    name: "sse-test-server",
    url: "https://sse.example.com/mcp",
  };

  const mockEnvVars = {
    API_KEY: "sse-api-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {
      // Mock console.error to prevent test output noise
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("正常系: SSEでツール一覧を取得する", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerToolsSSE(mockServer, mockEnvVars);

    expect(result).toStrictEqual(mockTools);
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.listTools).toHaveBeenCalledTimes(1);
    expect(mockClient.close).toHaveBeenCalledTimes(1);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      new URL("https://sse.example.com/mcp"),
      {
        requestInit: { headers: mockEnvVars },
      },
    );
  });

  test("正常系: 10秒以内に接続が成功する", async () => {
    mockClient.connect.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(undefined), 5000);
        }),
    );
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const promise = getMcpServerToolsSSE(mockServer, mockEnvVars);
    vi.advanceTimersByTime(5000);
    const result = await promise;

    expect(result).toStrictEqual(mockTools);
  });

  test("異常系: 接続が10秒でタイムアウトする", async () => {
    mockClient.connect.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(undefined), 15000);
        }),
    );

    const promise = getMcpServerToolsSSE(mockServer, mockEnvVars);
    vi.advanceTimersByTime(10001);

    const result = await promise;

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "MCPサーバーへの接続がタイムアウトしました（10秒）",
      }),
    );
    expect(mockClient.close).not.toHaveBeenCalled();
  });

  test("異常系: 接続エラーが発生した場合に空配列を返す", async () => {
    mockClient.connect.mockRejectedValue(new Error("SSE Connection failed"));

    const result = await getMcpServerToolsSSE(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "SSE Connection failed",
      }),
    );
  });

  test("異常系: ツール一覧取得でエラーが発生した場合に空配列を返す", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockRejectedValue(new Error("SSE List tools failed"));

    const result = await getMcpServerToolsSSE(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "SSE List tools failed",
      }),
    );
    expect(mockClient.close).not.toHaveBeenCalled();
  });

  test("異常系: クローズ処理でエラーが発生した場合でも空配列を返す", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockResolvedValue({ tools: mockTools });
    mockClient.close.mockRejectedValue(new Error("SSE Close failed"));

    const result = await getMcpServerToolsSSE(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "SSE Close failed",
      }),
    );
  });

  test("境界値: urlがnullの場合にURL作成でエラーが発生し空配列を返す", async () => {
    const nullUrlServer = { ...mockServer, url: null };
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerToolsSSE(nullUrlServer, mockEnvVars);

    expect(result).toStrictEqual([]);
    expect(console.error).toHaveBeenCalled();
    expect(SSEClientTransport).not.toHaveBeenCalled();
  });

  test("正常系: 空のツール一覧を返す", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockResolvedValue({ tools: [] });

    const result = await getMcpServerToolsSSE(mockServer, mockEnvVars);

    expect(result).toStrictEqual([]);
  });

  test("境界値: 空の環境変数でも動作する", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.listTools.mockResolvedValue({ tools: mockTools });

    const result = await getMcpServerToolsSSE(mockServer, {});

    expect(result).toStrictEqual(mockTools);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      new URL("https://sse.example.com/mcp"),
      {
        requestInit: { headers: {} },
      },
    );
  });
});
