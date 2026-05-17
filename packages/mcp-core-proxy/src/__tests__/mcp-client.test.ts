import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { McpClientConnection } from "../outbound/mcp-client.js";
import type { McpServerConfig } from "../types.js";
import { connectMcpClient, createMcpClient } from "../outbound/mcp-client.js";

const mockConnect = vi.fn();
const mockClient = { connect: mockConnect };

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => mockClient),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

const MockClient = vi.mocked(Client);
const MockSSEClientTransport = vi.mocked(SSEClientTransport);
const MockStreamableHTTPClientTransport = vi.mocked(
  StreamableHTTPClientTransport,
);

beforeEach(() => {
  vi.clearAllMocks();
});

const createConfig = (
  overrides: Partial<McpServerConfig> = {},
): McpServerConfig =>
  ({
    name: "test-server",
    authType: "NONE",
    headers: {},
    transportType: "SSE",
    url: "https://example.com/events",
    ...overrides,
  }) as McpServerConfig;

describe("mcp-client helper", () => {
  test("createMcpClient が SSE トランスポートと MCP クライアントを返す", () => {
    const config = createConfig({
      transportType: "SSE",
      url: "https://example.com/events",
      headers: {
        Authorization: "Bearer token",
      },
    });

    const result: McpClientConnection = createMcpClient(config, {
      clientName: "custom-client",
    });

    expect(MockClient).toHaveBeenCalledWith(
      {
        name: "custom-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );
    expect(MockSSEClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        requestInit: {
          headers: { Authorization: "Bearer token" },
        },
      }),
    );
    expect(result.client).toBeDefined();
  });

  test("createMcpClient が STREAMABLE_HTTP トランスポートを処理する", () => {
    const config = createConfig({
      transportType: "STREAMABLE_HTTP",
      url: "https://example.com/stream",
      headers: {
        Authorization: "Bearer stream",
      },
    });

    createMcpClient(config);

    expect(MockStreamableHTTPClientTransport).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        requestInit: {
          headers: { Authorization: "Bearer stream" },
        },
      }),
    );
  });

  test("connectMcpClient がクライアントを接続する", async () => {
    const config = createConfig({
      transportType: "SSE",
      url: "https://example.com/events",
    });

    const client = await connectMcpClient(config, {
      clientName: "connected-client",
    });

    expect(mockConnect).toHaveBeenCalledOnce();
    expect(client).toBe(mockClient);
  });

  test("STREAMABLE_HTTP の getHeaders が毎リクエスト時に動的ヘッダを注入する", async () => {
    let currentToken = "first-token";
    const getHeaders = vi.fn().mockImplementation(async () => ({
      Authorization: `Bearer ${currentToken}`,
    }));

    const config = createConfig({
      transportType: "STREAMABLE_HTTP",
      url: "https://example.com/stream",
      headers: { "X-Static": "static" },
      getHeaders,
    });

    createMcpClient(config);

    const callArgs = MockStreamableHTTPClientTransport.mock.calls[0];
    expect(callArgs).toBeDefined();
    const opts = callArgs?.[1] as { fetch?: typeof fetch } | undefined;
    expect(opts?.fetch).toBeDefined();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));

    try {
      const customFetch = opts!.fetch!;
      await customFetch("https://example.com/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(getHeaders).toHaveBeenCalledTimes(1);
      const [, init1] = fetchSpy.mock.calls[0]!;
      const headers1 = init1!.headers as Record<string, string>;
      expect(headers1).toStrictEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer first-token",
      });

      // getHeaders 戻り値が変化すれば次回 fetch にも反映される（cache の動的反映を再現）
      currentToken = "second-token";
      await customFetch("https://example.com/stream", { method: "POST" });

      expect(getHeaders).toHaveBeenCalledTimes(2);
      const [, init2] = fetchSpy.mock.calls[1]!;
      const headers2 = init2!.headers as Record<string, string>;
      expect(headers2).toStrictEqual({
        Authorization: "Bearer second-token",
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("getHeaders が例外を投げても静的 headers にフォールバックして fetch が走る", async () => {
    const getHeaders = vi.fn().mockRejectedValue(new Error("cache miss"));

    const config = createConfig({
      transportType: "STREAMABLE_HTTP",
      url: "https://example.com/stream",
      headers: { Authorization: "Bearer fallback" },
      getHeaders,
    });

    createMcpClient(config);

    const callArgs = MockStreamableHTTPClientTransport.mock.calls[0];
    const opts = callArgs?.[1] as { fetch?: typeof fetch } | undefined;
    const customFetch = opts!.fetch!;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));

    try {
      await customFetch("https://example.com/stream", { method: "POST" });

      const [, init] = fetchSpy.mock.calls[0]!;
      const headers = init!.headers as Record<string, string>;
      expect(headers).toStrictEqual({ Authorization: "Bearer fallback" });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("getHeaders 未指定の STREAMABLE_HTTP は fetch オプションを渡さない", () => {
    const config = createConfig({
      transportType: "STREAMABLE_HTTP",
      url: "https://example.com/stream",
      headers: { Authorization: "Bearer static" },
    });

    createMcpClient(config);

    const callArgs = MockStreamableHTTPClientTransport.mock.calls[0];
    const opts = callArgs?.[1] as { fetch?: typeof fetch } | undefined;
    expect(opts?.fetch).toBeUndefined();
  });
});
