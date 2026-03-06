import { describe, test, expect, vi, beforeEach } from "vitest";

const {
  mockFindUnique,
  mockFindUniqueOrThrow,
  mockMcpConfigFindUnique,
  mockLogInfo,
  mockLogWarn,
  mockLogError,
  mockMetaTools,
  mockConnectToMcpServer,
  mockUpdateExecutionContext,
  mockExtractMcpErrorInfo,
  mockGetErrorCodeName,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindUniqueOrThrow: vi.fn(),
  mockMcpConfigFindUnique: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
  mockLogError: vi.fn(),
  mockMetaTools: { value: [] as Array<{ name: string }> },
  mockConnectToMcpServer: vi.fn(),
  mockUpdateExecutionContext: vi.fn(),
  mockExtractMcpErrorInfo: vi.fn(),
  mockGetErrorCodeName: vi.fn(),
}));

vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpServer: {
      findUnique: mockFindUnique,
    },
    mcpServerTemplateInstance: {
      findUniqueOrThrow: mockFindUniqueOrThrow,
    },
    mcpConfig: {
      findUnique: mockMcpConfigFindUnique,
    },
  },
}));

vi.mock("../../../../../shared/logger/index.js", () => ({
  logInfo: mockLogInfo,
  logWarn: mockLogWarn,
  logError: mockLogError,
}));

vi.mock("../../../../dynamicSearch/index.js", () => ({
  get DYNAMIC_SEARCH_META_TOOLS() {
    return mockMetaTools.value;
  },
}));

vi.mock("../../../../../infrastructure/mcp/mcpClientFactory.js", () => ({
  connectToMcpServer: mockConnectToMcpServer,
}));

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

vi.mock("../../../../../shared/errors/index.js", () => ({
  extractMcpErrorInfo: mockExtractMcpErrorInfo,
  getErrorCodeName: mockGetErrorCodeName,
}));

vi.mock("../../../middleware/requestLogging/context.js", () => ({
  updateExecutionContext: mockUpdateExecutionContext,
}));

import { callToolCommand } from "../callToolCommand.js";
import {
  listToolsQuery,
  getInternalToolsForDynamicSearch,
} from "../../../queries/listTools/listToolsQuery.js";
import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";

describe("listToolsQuery", () => {
  const mcpServerId = "server-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockMetaTools.value = [];
  });

  test("McpServerが見つからない場合はエラーをスローする", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(listToolsQuery({ mcpServerId })).rejects.toMatchObject({
      name: "DomainError",
      code: "MCP_ERROR",
      message: `Failed to get allowed tools for server ${mcpServerId}: McpServer not found: ${mcpServerId}`,
    });

    expect(mockLogError).toHaveBeenCalledWith(
      "Failed to get allowed tools",
      expect.any(Error),
      { mcpServerId },
    );
  });

  test("dynamicSearch=false の場合、通常のツールリストを返す", async () => {
    mockFindUnique.mockResolvedValue({
      dynamicSearch: false,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1 description",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
      ],
    });

    const result = await listToolsQuery({ mcpServerId });

    expect(result.dynamicSearch).toBe(false);
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("instance1__tool1");
    expect(result.tools[0].description).toBe("Tool 1 description");
  });

  test("dynamicSearch=true かつ EE版（メタツールあり）の場合、メタツールを返す", async () => {
    mockMetaTools.value = [
      { name: "search_tools" },
      { name: "describe_tools" },
      { name: "execute_tool" },
    ];

    mockFindUnique.mockResolvedValue({
      dynamicSearch: true,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await listToolsQuery({ mcpServerId });

    expect(result.dynamicSearch).toBe(true);
    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t: { name: string }) => t.name)).toStrictEqual([
      "search_tools",
      "describe_tools",
      "execute_tool",
    ]);
    expect(mockLogInfo).toHaveBeenCalledWith(
      "Dynamic Search enabled, returning meta tools",
      { mcpServerId, metaToolCount: 3 },
    );
  });

  test("dynamicSearch=true かつ CE版（メタツールなし）の場合、警告ログを出力して通常のツールリストにフォールバック", async () => {
    mockMetaTools.value = [];

    mockFindUnique.mockResolvedValue({
      dynamicSearch: true,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1",
              inputSchema: { type: "object" },
            },
            {
              name: "tool2",
              description: null,
              inputSchema: { type: "object", properties: { arg: {} } },
            },
          ],
        },
        {
          normalizedName: "instance2",
          allowedTools: [
            {
              name: "tool3",
              description: "Tool 3",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await listToolsQuery({ mcpServerId });

    expect(result.dynamicSearch).toBe(false);
    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t: { name: string }) => t.name)).toStrictEqual([
      "instance1__tool1",
      "instance1__tool2",
      "instance2__tool3",
    ]);

    expect(mockLogWarn).toHaveBeenCalledWith(
      "Dynamic Search enabled but meta tools not available (CE version). Falling back to normal tools.",
      { mcpServerId },
    );
  });

  test("複数のテンプレートインスタンスから全ツールを集約する", async () => {
    mockFindUnique.mockResolvedValue({
      dynamicSearch: false,
      templateInstances: [
        {
          normalizedName: "slack",
          allowedTools: [
            {
              name: "send_message",
              description: "Send a message",
              inputSchema: { type: "object" },
            },
            {
              name: "list_channels",
              description: "List channels",
              inputSchema: { type: "object" },
            },
          ],
        },
        {
          normalizedName: "github",
          allowedTools: [
            {
              name: "create_issue",
              description: "Create an issue",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await listToolsQuery({ mcpServerId });

    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t: { name: string }) => t.name)).toStrictEqual([
      "slack__send_message",
      "slack__list_channels",
      "github__create_issue",
    ]);
  });

  test("description が null の場合は undefined に変換される", async () => {
    mockFindUnique.mockResolvedValue({
      dynamicSearch: false,
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: null,
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await listToolsQuery({ mcpServerId });

    expect(result.tools[0].description).toBeUndefined();
  });

  test("Error以外のオブジェクトがスローされた場合はUnknown errorメッセージを含む", async () => {
    mockFindUnique.mockRejectedValue("string error");

    await expect(listToolsQuery({ mcpServerId })).rejects.toMatchObject({
      name: "DomainError",
      code: "UNKNOWN_ERROR",
      message: `Failed to get allowed tools for server ${mcpServerId}: Unknown error`,
    });
  });
});

describe("callToolCommand", () => {
  const mcpServerId = "server-123";
  const organizationId = "org-123";
  const userId = "user-123";

  const createTemplateInstance = (overrides = {}) => ({
    id: "instance-id-1",
    isEnabled: true,
    mcpServer: { organizationId: "org-123" },
    mcpServerTemplate: {
      id: "template-1",
      transportType: "STREAMABLE_HTTPS",
      name: "Test Template",
      mcpTools: [
        {
          name: "tool1",
          description: "Tool 1",
          inputSchema: { type: "object" },
        },
      ],
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("正常系: ツールを実行して結果を返す", async () => {
    const expectedResult = { content: [{ type: "text", text: "ok" }] };
    mockFindUniqueOrThrow.mockResolvedValue(createTemplateInstance());
    mockMcpConfigFindUnique.mockResolvedValue({ id: "config", envVars: {} });
    const mockClose = vi.fn();
    mockConnectToMcpServer.mockResolvedValue({
      callTool: vi.fn().mockResolvedValue(expectedResult),
      close: mockClose,
    });

    const result = await callToolCommand({
      mcpServerId,
      organizationId,
      fullToolName: "instance1__tool1",
      args: { arg: "val" },
      userId,
    });

    expect(result).toStrictEqual(expectedResult);
    expect(mockClose).toHaveBeenCalled();
  });

  test("organizationId不一致の場合はエラーをスローする", async () => {
    mockFindUniqueOrThrow.mockResolvedValue(
      createTemplateInstance({
        mcpServer: { organizationId: "different-org" },
      }),
    );
    mockExtractMcpErrorInfo.mockReturnValue({
      errorCode: -32603,
      httpStatus: 500,
      errorMessage: "Organization ID mismatch",
    });
    mockGetErrorCodeName.mockReturnValue("InternalError");

    await expect(
      callToolCommand({
        mcpServerId,
        organizationId,
        fullToolName: "instance1__tool1",
        args: {},
        userId,
      }),
    ).rejects.toThrow("Failed to execute tool");
  });

  test("ツールが見つからない場合はエラーをスローする", async () => {
    mockFindUniqueOrThrow.mockResolvedValue(
      createTemplateInstance({
        mcpServerTemplate: {
          id: "template-1",
          transportType: "STREAMABLE_HTTPS",
          name: "Test Template",
          mcpTools: [],
        },
      }),
    );
    mockExtractMcpErrorInfo.mockReturnValue({
      errorCode: -32603,
      httpStatus: 500,
      errorMessage: "Tool not found: instance1__tool1",
    });
    mockGetErrorCodeName.mockReturnValue("InternalError");

    await expect(
      callToolCommand({
        mcpServerId,
        organizationId,
        fullToolName: "instance1__tool1",
        args: {},
        userId,
      }),
    ).rejects.toThrow("Failed to execute tool");
  });

  test("ReAuthRequiredErrorはそのまま再スローする", async () => {
    mockFindUniqueOrThrow.mockResolvedValue(createTemplateInstance());
    mockMcpConfigFindUnique.mockResolvedValue(null);
    mockConnectToMcpServer.mockResolvedValue({
      callTool: vi
        .fn()
        .mockRejectedValue(
          new ReAuthRequiredError(
            "re-auth needed",
            "token-1",
            "user-123",
            "server-123",
          ),
        ),
      close: vi.fn(),
    });

    await expect(
      callToolCommand({
        mcpServerId,
        organizationId,
        fullToolName: "instance1__tool1",
        args: {},
        userId,
      }),
    ).rejects.toThrow(ReAuthRequiredError);
  });

  test("一般エラーの場合はMCPエラー情報を抽出してログに記録する", async () => {
    mockFindUniqueOrThrow.mockResolvedValue(createTemplateInstance());
    mockMcpConfigFindUnique.mockResolvedValue(null);
    mockConnectToMcpServer.mockResolvedValue({
      callTool: vi.fn().mockRejectedValue(new Error("connection failed")),
      close: vi.fn(),
    });
    mockExtractMcpErrorInfo.mockReturnValue({
      errorCode: -32603,
      httpStatus: 500,
      errorMessage: "connection failed",
    });
    mockGetErrorCodeName.mockReturnValue("InternalError");

    await expect(
      callToolCommand({
        mcpServerId,
        organizationId,
        fullToolName: "instance1__tool1",
        args: {},
        userId,
      }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "MCP_ERROR",
    });

    expect(mockExtractMcpErrorInfo).toHaveBeenCalled();
    expect(mockUpdateExecutionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        httpStatus: 500,
        errorCode: -32603,
        errorMessage: "connection failed",
      }),
    );
  });
});

describe("getInternalToolsForDynamicSearch", () => {
  const mcpServerId = "server-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("全ツールリストを返す", async () => {
    mockFindUnique.mockResolvedValue({
      templateInstances: [
        {
          normalizedName: "instance1",
          allowedTools: [
            {
              name: "tool1",
              description: "Tool 1",
              inputSchema: { type: "object" },
            },
          ],
        },
      ],
    });

    const result = await getInternalToolsForDynamicSearch(mcpServerId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("instance1__tool1");
  });

  test("McpServerが見つからない場合はエラーをスローする", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(getInternalToolsForDynamicSearch(mcpServerId)).rejects.toThrow(
      "Failed to get internal tools",
    );
  });

  test("DBエラーの場合はエラーをスローする", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error"));

    await expect(getInternalToolsForDynamicSearch(mcpServerId)).rejects.toThrow(
      "Failed to get internal tools",
    );
  });

  test("Error以外のオブジェクトがスローされた場合はUnknown errorメッセージを含む", async () => {
    mockFindUnique.mockRejectedValue("string error");

    await expect(
      getInternalToolsForDynamicSearch(mcpServerId),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "UNKNOWN_ERROR",
      message: `Failed to get internal tools for server ${mcpServerId}: Unknown error`,
    });
  });
});
