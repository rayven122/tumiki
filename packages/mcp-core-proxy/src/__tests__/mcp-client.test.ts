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

  test("SSE で resolveHeaders 指定時に fetch オプションが追加される", () => {
    const resolveHeaders = vi
      .fn()
      .mockResolvedValue({ Authorization: "Bearer dynamic" });
    const config = createConfig({
      transportType: "SSE",
      url: "https://example.com/events",
      headers: { "X-Static": "value" },
      resolveHeaders,
    });

    createMcpClient(config);

    const sseOpts = MockSSEClientTransport.mock.calls[0]?.[1];
    expect(sseOpts).toMatchObject({
      requestInit: { headers: { "X-Static": "value" } },
    });
    // resolveHeaders 指定時は eventSourceInit.fetch と top-level fetch の両方が設定される
    expect(sseOpts).toHaveProperty("fetch");
    expect(sseOpts?.eventSourceInit).toHaveProperty("fetch");
  });

  test("SSE で resolveHeaders 未指定時は top-level fetch オプションは追加されない", () => {
    const config = createConfig({
      transportType: "SSE",
      url: "https://example.com/events",
      headers: { Authorization: "Bearer static" },
    });

    createMcpClient(config);

    const sseOpts = MockSSEClientTransport.mock.calls[0]?.[1];
    // top-level fetch は無し、ただし eventSourceInit.fetch は SSE仕様の都合で常に必要
    expect(sseOpts).not.toHaveProperty("fetch");
    expect(sseOpts?.eventSourceInit).toHaveProperty("fetch");
  });

  test("STREAMABLE_HTTP で resolveHeaders 指定時に fetch オプションが追加される", () => {
    const resolveHeaders = vi
      .fn()
      .mockResolvedValue({ Authorization: "Bearer dynamic" });
    const config = createConfig({
      transportType: "STREAMABLE_HTTP",
      url: "https://example.com/stream",
      headers: { "X-Static": "value" },
      resolveHeaders,
    });

    createMcpClient(config);

    const httpOpts = MockStreamableHTTPClientTransport.mock.calls[0]?.[1];
    expect(httpOpts).toMatchObject({
      requestInit: { headers: { "X-Static": "value" } },
    });
    expect(httpOpts).toHaveProperty("fetch");
  });

  test("STREAMABLE_HTTP で resolveHeaders 未指定時は fetch オプションは追加されない", () => {
    const config = createConfig({
      transportType: "STREAMABLE_HTTP",
      url: "https://example.com/stream",
      headers: { Authorization: "Bearer static" },
    });

    createMcpClient(config);

    const httpOpts = MockStreamableHTTPClientTransport.mock.calls[0]?.[1];
    expect(httpOpts).not.toHaveProperty("fetch");
  });

  test("customFetch は static + dynamic を既存ヘッダーにマージする（dynamic優先）", async () => {
    // 実 fetch をスタブ
    const realFetch = global.fetch;
    const capturedHeaders: Headers[] = [];
    global.fetch = vi.fn(async (_input, init?: RequestInit) => {
      capturedHeaders.push(init?.headers as Headers);
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    try {
      const resolveHeaders = vi
        .fn()
        .mockResolvedValue({ Authorization: "Bearer DYNAMIC" });
      const config = createConfig({
        transportType: "STREAMABLE_HTTP",
        url: "https://example.com/stream",
        headers: { Authorization: "Bearer STATIC", "X-Static": "S" },
        resolveHeaders,
      });

      createMcpClient(config);

      // SDK が transport 内部で fetch を呼ぶ動きを模倣
      const fetchOpt = (
        MockStreamableHTTPClientTransport.mock.calls[0]?.[1] as
          | { fetch: typeof fetch }
          | undefined
      )?.fetch;
      expect(fetchOpt).toBeDefined();

      await fetchOpt!("https://example.com/api", {
        headers: { Authorization: "Bearer EXISTING", "X-Existing": "E" },
      });

      expect(resolveHeaders).toHaveBeenCalledTimes(1);
      const h = capturedHeaders[0];
      expect(h?.get("authorization")).toBe("Bearer DYNAMIC");
      expect(h?.get("x-static")).toBe("S");
      expect(h?.get("x-existing")).toBe("E");
    } finally {
      global.fetch = realFetch;
    }
  });

  test("customFetch は SDK が小文字 Authorization を渡してきても dynamic で上書きする（case-insensitive dedup）", async () => {
    // 回帰防止:
    // MCP SDK の StreamableHTTPClientTransport は内部で Headers クラスを使うため、
    // init.headers として渡してくる際にキーは小文字 (`authorization`) になる。
    // 一方で staticHeaders / dynamicHeaders は config 側で `Authorization` (大文字) のまま渡される。
    // 過去に plain object マージで両方残り `Bearer X, Bearer Y` がカンマ結合送信されるバグがあった。
    // Headers インスタンスを使った set() ベースのマージで case-insensitive に dedup されることを保証する。
    const realFetch = global.fetch;
    const capturedHeaders: Headers[] = [];
    global.fetch = vi.fn(async (_input, init?: RequestInit) => {
      capturedHeaders.push(init?.headers as Headers);
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    try {
      const resolveHeaders = vi
        .fn()
        .mockResolvedValue({ Authorization: "Bearer DYNAMIC" });
      const config = createConfig({
        transportType: "STREAMABLE_HTTP",
        url: "https://example.com/stream",
        headers: { Authorization: "Bearer STATIC" },
        resolveHeaders,
      });

      createMcpClient(config);
      const fetchOpt = (
        MockStreamableHTTPClientTransport.mock.calls[0]?.[1] as
          | { fetch: typeof fetch }
          | undefined
      )?.fetch;
      expect(fetchOpt).toBeDefined();

      // SDK が Headers クラスで渡してくる挙動を再現（キーは小文字に正規化される）
      const sdkHeaders = new Headers({ Authorization: "Bearer SDK_OLD" });
      await fetchOpt!("https://example.com/api", { headers: sdkHeaders });

      const h = capturedHeaders[0];
      // get() は case-insensitive で 1 つしか取れない。値はカンマ結合されてはいけない
      expect(h?.get("authorization")).toBe("Bearer DYNAMIC");
      // raw を取って verify: カンマ結合されていないこと
      expect(h?.get("authorization")).not.toContain(",");
    } finally {
      global.fetch = realFetch;
    }
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
});
