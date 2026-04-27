import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpConfig, McpServerTemplate } from "@tumiki/db/prisma";

// @modelcontextprotocol/sdk のモック
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn(),
}));

vi.mock("@tumiki/core-mcp-proxy", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tumiki/core-mcp-proxy")>();
  return {
    ...actual,
    connectMcpClient: vi.fn(async (config, options) => {
      const { client, transport } = actual.createMcpClient(config, options);
      if (typeof client.connect === "function") {
        await client.connect(transport);
      }
      return client;
    }),
  };
});

// authHeaderInjector のモック
vi.mock("../authHeaderInjector.js", () => ({
  injectAuthHeaders: vi.fn(),
}));

// @tumiki/oauth-token-manager のモック
vi.mock("@tumiki/oauth-token-manager", () => ({
  ReAuthRequiredError: class ReAuthRequiredError extends Error {
    tokenId: string;
    userId: string;
    mcpServerId: string;
    constructor(
      message: string,
      tokenId: string,
      userId: string,
      mcpServerId: string,
    ) {
      super(message);
      this.name = "ReAuthRequiredError";
      this.tokenId = tokenId;
      this.userId = userId;
      this.mcpServerId = mcpServerId;
    }
  },
}));

// logger のモック
vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

import { connectToMcpServer } from "../mcpClientFactory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { injectAuthHeaders } from "../authHeaderInjector.js";

const { ReAuthRequiredError } = await import("@tumiki/oauth-token-manager");

// モック関数を取得
const MockClient = vi.mocked(Client);
const MockSSEClientTransport = vi.mocked(SSEClientTransport);
const MockStreamableHTTPClientTransport = vi.mocked(
  StreamableHTTPClientTransport,
);
const mockInjectAuthHeaders = vi.mocked(injectAuthHeaders);

const userId = "user-123";
const instanceId = "instance-456";

// テスト用のベーステンプレート生成ヘルパー
const createMockTemplate = (
  overrides: Partial<McpServerTemplate> = {},
): McpServerTemplate =>
  ({
    id: "template-1",
    name: "Test MCP Server",
    slug: "test-mcp-server",
    transportType: "STREAMABLE_HTTPS",
    authType: "OAUTH",
    url: "https://mcp.example.com",
    useCloudRunIam: false,
    envVarKeys: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as McpServerTemplate;

// テスト用のMcpConfig生成ヘルパー
const createMockConfig = (overrides: Partial<McpConfig> = {}): McpConfig =>
  ({
    id: "config-1",
    mcpServerTemplateInstanceId: "instance-1",
    envVars: JSON.stringify({}),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as McpConfig;

describe("connectToMcpServer", () => {
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect = vi.fn().mockResolvedValue(undefined);
    MockClient.mockImplementation(
      () =>
        ({
          connect: mockConnect,
        }) as never,
    );
    mockInjectAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("STREAMABLE_HTTPS トランスポート", () => {
    test("正常に接続できる", async () => {
      const template = createMockTemplate({
        transportType: "STREAMABLE_HTTPS",
        url: "https://mcp.example.com/mcp",
      });

      const client = await connectToMcpServer(
        template,
        userId,
        instanceId,
        null,
      );

      expect(client).toBeDefined();
      expect(MockStreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        {
          requestInit: {
            headers: { Authorization: "Bearer test-token" },
          },
        },
      );
      expect(mockConnect).toHaveBeenCalled();
    });

    test("URLがない場合はエラーをスローする", async () => {
      const template = createMockTemplate({
        transportType: "STREAMABLE_HTTPS",
        url: null,
      });

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow("STREAMABLE_HTTPS transport requires URL");
    });

    test("mcpConfigがある場合も正常に接続できる", async () => {
      const template = createMockTemplate({
        transportType: "STREAMABLE_HTTPS",
      });
      const config = createMockConfig();

      const client = await connectToMcpServer(
        template,
        userId,
        instanceId,
        config,
      );

      expect(client).toBeDefined();
      expect(mockInjectAuthHeaders).toHaveBeenCalledWith(
        template,
        userId,
        instanceId,
        config,
      );
    });
  });

  describe("SSE トランスポート", () => {
    test("正常に接続できる", async () => {
      const template = createMockTemplate({
        transportType: "SSE",
        url: "https://sse.example.com/events",
      });

      const client = await connectToMcpServer(
        template,
        userId,
        instanceId,
        null,
      );

      expect(client).toBeDefined();
      expect(MockSSEClientTransport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          requestInit: {
            headers: { Authorization: "Bearer test-token" },
          },
        }),
      );
      expect(mockConnect).toHaveBeenCalled();
    });

    test("URLがない場合はエラーをスローする", async () => {
      const template = createMockTemplate({
        transportType: "SSE",
        url: null,
      });

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow("SSE transport requires URL");
    });
  });

  describe("STDIO トランスポート", () => {
    test("サポートされていないエラーをスローする", async () => {
      const template = createMockTemplate({
        transportType: "STDIO",
      });

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow("STDIO transport is not supported");
    });
  });

  describe("認証ヘッダーの注入", () => {
    test("injectAuthHeadersが正しい引数で呼ばれる", async () => {
      const template = createMockTemplate();
      const config = createMockConfig();

      await connectToMcpServer(template, userId, instanceId, config);

      expect(mockInjectAuthHeaders).toHaveBeenCalledWith(
        template,
        userId,
        instanceId,
        config,
      );
    });

    test("ヘッダーがトランスポートに渡される", async () => {
      mockInjectAuthHeaders.mockResolvedValue({
        Authorization: "Bearer custom-token",
        "X-Custom-Header": "custom-value",
      });

      const template = createMockTemplate({
        transportType: "STREAMABLE_HTTPS",
      });

      await connectToMcpServer(template, userId, instanceId, null);

      expect(MockStreamableHTTPClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        {
          requestInit: {
            headers: {
              Authorization: "Bearer custom-token",
              "X-Custom-Header": "custom-value",
            },
          },
        },
      );
    });
  });

  describe("エラーハンドリング", () => {
    test("ReAuthRequiredErrorはそのまま伝播する", async () => {
      const template = createMockTemplate();
      mockInjectAuthHeaders.mockRejectedValue(
        new ReAuthRequiredError(
          "Re-authentication required",
          "token-123",
          userId,
          "mcp-server-123",
        ),
      );

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow(ReAuthRequiredError);
    });

    test("接続エラーはラップして伝播する", async () => {
      const template = createMockTemplate();
      mockConnect.mockRejectedValue(new Error("Connection timeout"));

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow("Failed to connect to MCP server");
    });

    test("認証ヘッダー取得エラーはラップして伝播する", async () => {
      const template = createMockTemplate();
      mockInjectAuthHeaders.mockRejectedValue(new Error("Auth failed"));

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow("Failed to connect to MCP server");
    });

    test("Error以外のオブジェクトがスローされた場合はUnknown errorメッセージで伝播する", async () => {
      const template = createMockTemplate();
      mockInjectAuthHeaders.mockRejectedValue("string error");

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow(
        "Failed to connect to MCP server Test MCP Server: Unknown error",
      );
    });
  });

  describe("クライアント設定", () => {
    test("クライアントが正しい名前とバージョンで作成される", async () => {
      const template = createMockTemplate({
        name: "My Custom MCP",
      });

      await connectToMcpServer(template, userId, instanceId, null);

      expect(MockClient).toHaveBeenCalledWith(
        {
          name: "tumiki-mcp-proxy-My Custom MCP",
          version: "1.0.0",
        },
        {
          capabilities: {},
        },
      );
    });
  });

  describe("未知のトランスポートタイプ", () => {
    test("未知のトランスポートタイプの場合はエラーをスローする", async () => {
      const template = createMockTemplate({
        transportType: "INVALID" as never,
      });

      await expect(
        connectToMcpServer(template, userId, instanceId, null),
      ).rejects.toThrow("Unknown transport type: INVALID");
    });
  });
});

describe("connectToMcpServer core helper delegation", () => {
  test("STREAMABLE_HTTPS が core helper を経由し STREAMABLE_HTTP で接続される", async () => {
    const coreProxy = await import("@tumiki/core-mcp-proxy");
    const connectSpy = vi.mocked(coreProxy.connectMcpClient);

    const template = createMockTemplate({
      transportType: "STREAMABLE_HTTPS",
      url: "https://mcp.example.com/mcp",
      authType: "OAUTH",
    });

    mockInjectAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
      "X-Custom-Header": "custom-value",
    });

    try {
      const client = await connectToMcpServer(
        template,
        userId,
        instanceId,
        null,
      );

      expect(client).toBeDefined();
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: template.name,
          transportType: "STREAMABLE_HTTP",
          url: template.url,
          authType: "BEARER",
          headers: {
            Authorization: "Bearer test-token",
            "X-Custom-Header": "custom-value",
          },
        }),
        {
          clientName: `tumiki-mcp-proxy-${template.name}`,
        },
      );
    } finally {
      connectSpy.mockRestore();
    }
  });

  test("SSE が core helper を経由して接続される", async () => {
    const coreProxy = await import("@tumiki/core-mcp-proxy");
    const connectSpy = vi.mocked(coreProxy.connectMcpClient);
    const template = createMockTemplate({
      transportType: "SSE",
      url: "https://mcp.example.com/events",
    });
    mockInjectAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    try {
      await connectToMcpServer(template, userId, instanceId, null);

      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transportType: "SSE",
          url: template.url,
          headers: {
            Authorization: "Bearer test-token",
          },
        }),
        {
          clientName: `tumiki-mcp-proxy-${template.name}`,
        },
      );
    } finally {
      connectSpy.mockRestore();
    }
  });
});
