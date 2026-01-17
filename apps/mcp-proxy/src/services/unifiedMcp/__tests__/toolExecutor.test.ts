/**
 * ツール実行サービスのテスト
 */

/* eslint-disable @typescript-eslint/unbound-method */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { TransportType, AuthType, PiiMaskingMode } from "@tumiki/db/server";

// DBをモック
vi.mock("@tumiki/db/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...mod,
    db: {
      mcpServerTemplateInstance: {
        findUniqueOrThrow: vi.fn(),
      },
      mcpConfig: {
        findUnique: vi.fn(),
      },
      mcpServer: {
        findUniqueOrThrow: vi.fn(),
      },
    },
  };
});

// mcpConnectionをモック
vi.mock("../../mcpConnection.js", () => ({
  connectToMcpServer: vi.fn(),
}));

// loggerをモック
vi.mock("../../../libs/logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// requestLogging contextをモック
vi.mock("../../../middleware/requestLogging/context.js", () => ({
  updateExecutionContext: vi.fn(),
}));

import { db } from "@tumiki/db/server";
import { connectToMcpServer } from "../../mcpConnection.js";
import { updateExecutionContext } from "../../../middleware/requestLogging/context.js";
import { executeUnifiedTool, getChildServerSettings } from "../toolExecutor.js";

describe("executeUnifiedTool", () => {
  const unifiedMcpServerId = "unified-server-123";
  const organizationId = "org-123";
  const userId = "user-123";
  const mcpServerId = "server-456";
  const instanceName = "instance_a";
  const toolName = "my_tool";
  const fullToolName = `${mcpServerId}__${instanceName}__${toolName}`;

  const mockMcpTool = {
    id: "tool-1",
    name: toolName,
    description: "Test tool",
    inputSchema: { type: "object" },
  };

  const mockTemplate = {
    id: "template-1",
    name: "Test Template",
    normalizedName: "test_template",
    transportType: TransportType.STREAMABLE_HTTPS,
    authType: AuthType.API_KEY,
    url: "https://example.com/mcp",
    command: null,
    args: [],
    envVarKeys: [],
    oauthProvider: null,
    oauthScopes: [],
    useCloudRunIam: false,
    mcpTools: [mockMcpTool],
  };

  const mockTemplateInstance = {
    id: "instance-1",
    mcpServerId,
    normalizedName: instanceName,
    mcpServer: {
      organizationId,
      deletedAt: null,
      piiMaskingMode: PiiMaskingMode.BOTH,
      piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
      toonConversionEnabled: true,
    },
    mcpServerTemplate: mockTemplate,
  };

  const mockMcpConfig = {
    id: "config-1",
    envVars: JSON.stringify({ API_KEY: "test-key" }),
    mcpServerTemplateInstanceId: "instance-1",
    organizationId,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClient = {
    callTool: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("3階層ツール名をパースしてツールを正常に実行できる", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(
      mockMcpConfig as never,
    );
    vi.mocked(connectToMcpServer).mockResolvedValue(mockClient as never);
    mockClient.callTool.mockResolvedValue({
      content: [{ type: "text", text: "Success" }],
    });

    const result = await executeUnifiedTool(
      unifiedMcpServerId,
      organizationId,
      fullToolName,
      { input: "test" },
      userId,
    );

    // テンプレートインスタンスの取得を検証
    expect(db.mcpServerTemplateInstance.findUniqueOrThrow).toHaveBeenCalledWith(
      {
        where: {
          mcpServerId_normalizedName: {
            mcpServerId,
            normalizedName: instanceName,
          },
        },
        include: {
          mcpServer: {
            select: {
              organizationId: true,
              deletedAt: true,
              piiMaskingMode: true,
              piiInfoTypes: true,
              toonConversionEnabled: true,
            },
          },
          mcpServerTemplate: {
            include: {
              mcpTools: true,
            },
          },
        },
      },
    );

    // MCP接続を検証
    expect(connectToMcpServer).toHaveBeenCalledWith(
      mockTemplate,
      userId,
      "instance-1",
      mockMcpConfig,
    );

    // ツール実行を検証
    expect(mockClient.callTool).toHaveBeenCalledWith({
      name: toolName,
      arguments: { input: "test" },
    });

    // クローズを検証
    expect(mockClient.close).toHaveBeenCalled();

    // 結果を検証
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "Success" }],
    });
  });

  test("環境変数設定（McpConfig）がある場合に正しく渡される", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(
      mockMcpConfig as never,
    );
    vi.mocked(connectToMcpServer).mockResolvedValue(mockClient as never);
    mockClient.callTool.mockResolvedValue({
      content: [{ type: "text", text: "Success" }],
    });

    await executeUnifiedTool(
      unifiedMcpServerId,
      organizationId,
      fullToolName,
      {},
      userId,
    );

    // McpConfigの取得を検証
    expect(db.mcpConfig.findUnique).toHaveBeenCalledWith({
      where: {
        mcpServerTemplateInstanceId_userId_organizationId: {
          mcpServerTemplateInstanceId: "instance-1",
          organizationId,
          userId,
        },
      },
      select: {
        id: true,
        envVars: true,
        mcpServerTemplateInstanceId: true,
        organizationId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // connectToMcpServerにMcpConfigが渡されることを検証
    expect(connectToMcpServer).toHaveBeenCalledWith(
      mockTemplate,
      userId,
      "instance-1",
      mockMcpConfig,
    );
  });

  test("環境変数設定がnullの場合も正常に動作する", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(null);
    vi.mocked(connectToMcpServer).mockResolvedValue(mockClient as never);
    mockClient.callTool.mockResolvedValue({
      content: [{ type: "text", text: "Success" }],
    });

    const result = await executeUnifiedTool(
      unifiedMcpServerId,
      organizationId,
      fullToolName,
      {},
      userId,
    );

    // connectToMcpServerにnullが渡されることを検証
    expect(connectToMcpServer).toHaveBeenCalledWith(
      mockTemplate,
      userId,
      "instance-1",
      null,
    );

    expect(result).toStrictEqual({
      content: [{ type: "text", text: "Success" }],
    });
  });

  test("実行コンテキストにPII/TOON設定が正しく記録される", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(null);
    vi.mocked(connectToMcpServer).mockResolvedValue(mockClient as never);
    mockClient.callTool.mockResolvedValue({
      content: [{ type: "text", text: "Success" }],
    });

    await executeUnifiedTool(
      unifiedMcpServerId,
      organizationId,
      fullToolName,
      {},
      userId,
    );

    // updateExecutionContextの呼び出しを検証
    expect(updateExecutionContext).toHaveBeenCalledWith({
      method: "tools/call",
      transportType: TransportType.STREAMABLE_HTTPS,
      toolName: fullToolName,
      piiMaskingMode: PiiMaskingMode.BOTH,
      piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
      toonConversionEnabled: true,
      actualMcpServerId: mcpServerId,
    });
  });

  test("ツール実行後にMCPクライアントがクローズされる", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(null);
    vi.mocked(connectToMcpServer).mockResolvedValue(mockClient as never);
    mockClient.callTool.mockResolvedValue({
      content: [{ type: "text", text: "Success" }],
    });

    await executeUnifiedTool(
      unifiedMcpServerId,
      organizationId,
      fullToolName,
      {},
      userId,
    );

    // クローズが呼ばれたことを検証
    expect(mockClient.close).toHaveBeenCalledTimes(1);
  });

  test("不正な3階層ツール名フォーマットの場合はエラーをスローする", async () => {
    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        "invalid_tool_name", // 区切り文字が足りない
        {},
        userId,
      ),
    ).rejects.toThrow(
      'Invalid unified tool name format: "invalid_tool_name". Expected format: "{mcpServerId}__{instanceName}__{toolName}"',
    );
  });

  test("組織IDが一致しない場合はエラーをスローする", async () => {
    const instanceWithDifferentOrg = {
      ...mockTemplateInstance,
      mcpServer: {
        ...mockTemplateInstance.mcpServer,
        organizationId: "different-org-id",
      },
    };

    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      instanceWithDifferentOrg as never,
    );

    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        fullToolName,
        {},
        userId,
      ),
    ).rejects.toThrow(
      `Organization ID mismatch: expected ${organizationId}, got different-org-id`,
    );
  });

  test("論理削除されたMCPサーバーの場合はエラーをスローする", async () => {
    const deletedInstance = {
      ...mockTemplateInstance,
      mcpServer: {
        ...mockTemplateInstance.mcpServer,
        deletedAt: new Date("2024-01-01"),
      },
    };

    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      deletedInstance as never,
    );

    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        fullToolName,
        {},
        userId,
      ),
    ).rejects.toThrow(`MCP server has been deleted: ${mcpServerId}`);
  });

  test("テンプレートインスタンスが存在しない場合はエラーをスローする", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockRejectedValue(
      new Error("Record not found"),
    );

    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        fullToolName,
        {},
        userId,
      ),
    ).rejects.toThrow("Record not found");
  });

  test("ツールが存在しない場合はエラーをスローする", async () => {
    const instanceWithNoMatchingTool = {
      ...mockTemplateInstance,
      mcpServerTemplate: {
        ...mockTemplate,
        mcpTools: [
          {
            id: "other-tool",
            name: "other_tool",
            description: "Other tool",
            inputSchema: {},
          },
        ],
      },
    };

    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      instanceWithNoMatchingTool as never,
    );

    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        fullToolName,
        {},
        userId,
      ),
    ).rejects.toThrow(`Tool not found: ${fullToolName}`);
  });

  test("MCP接続に失敗した場合はエラーをスローする", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(null);
    vi.mocked(connectToMcpServer).mockRejectedValue(
      new Error("Connection failed"),
    );

    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        fullToolName,
        {},
        userId,
      ),
    ).rejects.toThrow(`Failed to execute unified tool ${fullToolName}`);
  });

  test("ツール実行に失敗した場合はエラーをスローする", async () => {
    vi.mocked(db.mcpServerTemplateInstance.findUniqueOrThrow).mockResolvedValue(
      mockTemplateInstance as never,
    );
    vi.mocked(db.mcpConfig.findUnique).mockResolvedValue(null);
    vi.mocked(connectToMcpServer).mockResolvedValue(mockClient as never);
    mockClient.callTool.mockRejectedValue(new Error("Tool execution failed"));

    await expect(
      executeUnifiedTool(
        unifiedMcpServerId,
        organizationId,
        fullToolName,
        {},
        userId,
      ),
    ).rejects.toThrow(`Failed to execute unified tool ${fullToolName}`);
  });
});

describe("getChildServerSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("MCPサーバーのPII/TOON設定を正しく取得できる", async () => {
    const mockServer = {
      piiMaskingMode: PiiMaskingMode.REQUEST,
      piiInfoTypes: ["CREDIT_CARD_NUMBER", "EMAIL_ADDRESS"],
      toonConversionEnabled: false,
    };

    vi.mocked(db.mcpServer.findUniqueOrThrow).mockResolvedValue(
      mockServer as never,
    );

    const result = await getChildServerSettings("server-123");

    expect(db.mcpServer.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "server-123" },
      select: {
        piiMaskingMode: true,
        piiInfoTypes: true,
        toonConversionEnabled: true,
      },
    });

    expect(result).toStrictEqual({
      piiMaskingMode: PiiMaskingMode.REQUEST,
      piiInfoTypes: ["CREDIT_CARD_NUMBER", "EMAIL_ADDRESS"],
      toonConversionEnabled: false,
    });
  });

  test("存在しないMCPサーバーの場合はエラーをスローする", async () => {
    vi.mocked(db.mcpServer.findUniqueOrThrow).mockRejectedValue(
      new Error("Record not found"),
    );

    await expect(getChildServerSettings("non-existent-server")).rejects.toThrow(
      "Record not found",
    );
  });

  test("各設定値（piiMaskingMode, piiInfoTypes, toonConversionEnabled）を正しく返す", async () => {
    // PiiMaskingMode.DISABLEDの場合
    const mockServerDisabled = {
      piiMaskingMode: PiiMaskingMode.DISABLED,
      piiInfoTypes: [],
      toonConversionEnabled: true,
    };

    vi.mocked(db.mcpServer.findUniqueOrThrow).mockResolvedValue(
      mockServerDisabled as never,
    );

    const resultDisabled = await getChildServerSettings("server-disabled");

    expect(resultDisabled.piiMaskingMode).toBe(PiiMaskingMode.DISABLED);
    expect(resultDisabled.piiInfoTypes).toStrictEqual([]);
    expect(resultDisabled.toonConversionEnabled).toBe(true);

    // PiiMaskingMode.BOTHの場合
    const mockServerBoth = {
      piiMaskingMode: PiiMaskingMode.BOTH,
      piiInfoTypes: ["PERSON_NAME"],
      toonConversionEnabled: false,
    };

    vi.mocked(db.mcpServer.findUniqueOrThrow).mockResolvedValue(
      mockServerBoth as never,
    );

    const resultBoth = await getChildServerSettings("server-both");

    expect(resultBoth.piiMaskingMode).toBe(PiiMaskingMode.BOTH);
    expect(resultBoth.piiInfoTypes).toStrictEqual(["PERSON_NAME"]);
    expect(resultBoth.toonConversionEnabled).toBe(false);
  });
});
