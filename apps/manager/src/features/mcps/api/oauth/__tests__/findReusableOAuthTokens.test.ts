import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { findReusableOAuthTokens } from "../findReusableOAuthTokens";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerTemplateInstanceId } from "@/schema/ids";

describe("findReusableOAuthTokens", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testTemplateInstanceId = "instance-123" as McpServerTemplateInstanceId;
  const testMcpServerId = "mcp-server-123";
  const testTemplateId = "template-123";

  beforeEach(() => {
    // Prismaクライアントの部分モック
    // 必要なメソッドのみをモック化し、PrismaTransactionClient型としてキャスト
    mockTx = {
      mcpServerTemplateInstance: {
        findUnique: vi.fn(),
      },
      mcpOAuthToken: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("同じテンプレートの有効なトークンを返す", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: "OAUTH" as const,
      },
    };

    const futureDate = new Date(Date.now() + 3600000);
    const mockReusableTokens = [
      {
        id: "token-1",
        mcpServerTemplateInstanceId: "other-instance-1",
        expiresAt: futureDate,
        mcpServerTemplateInstance: {
          mcpServer: {
            id: "other-server-1",
            name: "Other MCP Server 1",
          },
          mcpServerTemplate: {
            iconPath: "/icons/server1.png",
          },
        },
      },
    ];

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue(
      mockReusableTokens as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findMany>
      >,
    );

    const result = await findReusableOAuthTokens(
      mockTx,
      { mcpServerTemplateInstanceId: testTemplateInstanceId },
      testOrganizationId,
      testUserId,
    );

    expect(result).toStrictEqual({
      tokens: [
        {
          tokenId: "token-1",
          mcpServerName: "Other MCP Server 1",
          mcpServerId: "other-server-1",
          sourceInstanceId: "other-instance-1",
          iconPath: "/icons/server1.png",
          expiresAt: futureDate,
        },
      ],
      mcpServerTemplateId: testTemplateId,
    });

    expect(mockTx.mcpServerTemplateInstance.findUnique).toHaveBeenCalledWith({
      where: { id: testTemplateInstanceId },
      include: {
        mcpServer: {
          select: {
            id: true,
            organizationId: true,
          },
        },
        mcpServerTemplate: {
          select: {
            id: true,
            authType: true,
          },
        },
      },
    });

    expect(mockTx.mcpOAuthToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: testUserId,
        organizationId: testOrganizationId,
        mcpServerTemplateInstanceId: {
          not: testTemplateInstanceId,
        },
        mcpServerTemplateInstance: {
          mcpServerTemplateId: testTemplateId,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: expect.any(Date) as Date } },
        ],
      },
      select: {
        id: true,
        mcpServerTemplateInstanceId: true,
        expiresAt: true,
        mcpServerTemplateInstance: {
          select: {
            mcpServer: {
              select: {
                id: true,
                name: true,
              },
            },
            mcpServerTemplate: {
              select: {
                iconPath: true,
              },
            },
          },
        },
      },
      orderBy: {
        expiresAt: "desc",
      },
    });
  });

  test("有効期限がnullのトークンも含まれる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: "OAUTH" as const,
      },
    };

    const mockReusableTokens = [
      {
        id: "token-no-expiry",
        mcpServerTemplateInstanceId: "other-instance-2",
        expiresAt: null,
        mcpServerTemplateInstance: {
          mcpServer: {
            id: "other-server-2",
            name: "Permanent Token Server",
          },
          mcpServerTemplate: {
            iconPath: null,
          },
        },
      },
    ];

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue(
      mockReusableTokens as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findMany>
      >,
    );

    const result = await findReusableOAuthTokens(
      mockTx,
      { mcpServerTemplateInstanceId: testTemplateInstanceId },
      testOrganizationId,
      testUserId,
    );

    expect(result).toStrictEqual({
      tokens: [
        {
          tokenId: "token-no-expiry",
          mcpServerName: "Permanent Token Server",
          mcpServerId: "other-server-2",
          sourceInstanceId: "other-instance-2",
          iconPath: null,
          expiresAt: null,
        },
      ],
      mcpServerTemplateId: testTemplateId,
    });
  });

  test("該当するトークンがない場合は空配列を返す", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: "OAUTH" as const,
      },
    };

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue([]);

    const result = await findReusableOAuthTokens(
      mockTx,
      { mcpServerTemplateInstanceId: testTemplateInstanceId },
      testOrganizationId,
      testUserId,
    );

    expect(result).toStrictEqual({
      tokens: [],
      mcpServerTemplateId: testTemplateId,
    });
  });

  test("存在しないインスタンスの場合はNOT_FOUNDエラーを投げる", async () => {
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      null,
    );

    await expect(
      findReusableOAuthTokens(
        mockTx,
        {
          mcpServerTemplateInstanceId:
            "non-existent-id" as McpServerTemplateInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "MCPサーバーが見つかりません",
      }),
    );
  });

  test("組織IDが一致しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: "different-org-id",
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: "OAUTH" as const,
      },
    };

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      findReusableOAuthTokens(
        mockTx,
        { mcpServerTemplateInstanceId: testTemplateInstanceId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "MCPサーバーが見つかりません",
      }),
    );
  });

  test("authTypeがnullの場合はBAD_REQUESTエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: null,
      },
    };

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      findReusableOAuthTokens(
        mockTx,
        { mcpServerTemplateInstanceId: testTemplateInstanceId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "このサーバーはOAuth認証に対応していません",
      }),
    );
  });

  test("authTypeがOAuth以外の場合はBAD_REQUESTエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: "API_KEY" as const,
      },
    };

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      findReusableOAuthTokens(
        mockTx,
        { mcpServerTemplateInstanceId: testTemplateInstanceId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "このサーバーはOAuth認証に対応していません",
      }),
    );
  });

  test("mcpServerTemplateがnullの場合はBAD_REQUESTエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: null,
    };

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      findReusableOAuthTokens(
        mockTx,
        { mcpServerTemplateInstanceId: testTemplateInstanceId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "このサーバーはOAuth認証に対応していません",
      }),
    );
  });

  test("複数の有効なトークンがある場合はすべて返す", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        authType: "OAUTH" as const,
      },
    };

    const futureDate1 = new Date(Date.now() + 7200000);
    const futureDate2 = new Date(Date.now() + 3600000);

    const mockReusableTokens = [
      {
        id: "token-1",
        mcpServerTemplateInstanceId: "other-instance-1",
        expiresAt: futureDate1,
        mcpServerTemplateInstance: {
          mcpServer: {
            id: "other-server-1",
            name: "Server A",
          },
          mcpServerTemplate: {
            iconPath: "/icons/a.png",
          },
        },
      },
      {
        id: "token-2",
        mcpServerTemplateInstanceId: "other-instance-2",
        expiresAt: futureDate2,
        mcpServerTemplateInstance: {
          mcpServer: {
            id: "other-server-2",
            name: "Server B",
          },
          mcpServerTemplate: {
            iconPath: "/icons/b.png",
          },
        },
      },
    ];

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue(
      mockReusableTokens as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findMany>
      >,
    );

    const result = await findReusableOAuthTokens(
      mockTx,
      { mcpServerTemplateInstanceId: testTemplateInstanceId },
      testOrganizationId,
      testUserId,
    );

    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0]).toStrictEqual({
      tokenId: "token-1",
      mcpServerName: "Server A",
      mcpServerId: "other-server-1",
      sourceInstanceId: "other-instance-1",
      iconPath: "/icons/a.png",
      expiresAt: futureDate1,
    });
    expect(result.tokens[1]).toStrictEqual({
      tokenId: "token-2",
      mcpServerName: "Server B",
      mcpServerId: "other-server-2",
      sourceInstanceId: "other-instance-2",
      iconPath: "/icons/b.png",
      expiresAt: futureDate2,
    });
  });
});
