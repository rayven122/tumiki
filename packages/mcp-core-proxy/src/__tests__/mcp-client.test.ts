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
  test("createMcpClient returns MCP client and SSE transport", () => {
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

  test("createMcpClient handles STREAMABLE_HTTP transport", () => {
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

  test("connectMcpClient connects the client", async () => {
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
