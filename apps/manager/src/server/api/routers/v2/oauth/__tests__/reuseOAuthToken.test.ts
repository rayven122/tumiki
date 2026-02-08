import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { reuseOAuthToken } from "../reuseOAuthToken";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerTemplateInstanceId } from "@/schema/ids";

describe("reuseOAuthToken", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testSourceTokenId = "token-source-123";
  const testTargetInstanceId =
    "instance-target-456" as McpServerTemplateInstanceId;
  const testTemplateId = "template-123";

  beforeEach(() => {
    // Prismaクライアントの部分モック
    // 必要なメソッドのみをモック化し、PrismaTransactionClient型としてキャスト
    mockTx = {
      mcpOAuthToken: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      mcpServerTemplateInstance: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("トークンを正常にコピーできる", async () => {
    const futureDate = new Date(Date.now() + 3600000);
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: testOrganizationId,
      oauthClientId: "oauth-client-123",
      accessToken: "access-token-source",
      refreshToken: "refresh-token-source",
      expiresAt: futureDate,
      tokenPurpose: "BACKEND_MCP" as const,
      oauthClient: {
        clientId: "client-id-123",
        clientSecret: "client-secret-123",
      },
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    const mockTargetInstance = {
      id: testTargetInstanceId,
      mcpServer: {
        id: "target-server-123",
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
      },
    };

    const mockCreatedToken = {
      id: "new-token-123",
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTargetInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.upsert).mockResolvedValue(
      mockCreatedToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.upsert>
      >,
    );

    const result = await reuseOAuthToken(
      mockTx,
      {
        sourceTokenId: testSourceTokenId,
        targetInstanceId: testTargetInstanceId,
      },
      testOrganizationId,
      testUserId,
    );

    expect(result).toStrictEqual({
      success: true,
      tokenId: "new-token-123",
    });

    expect(mockTx.mcpOAuthToken.findUnique).toHaveBeenCalledWith({
      where: { id: testSourceTokenId },
      include: {
        oauthClient: true,
        mcpServerTemplateInstance: {
          include: {
            mcpServerTemplate: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    expect(mockTx.mcpServerTemplateInstance.findUnique).toHaveBeenCalledWith({
      where: { id: testTargetInstanceId },
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
          },
        },
      },
    });

    expect(mockTx.mcpOAuthToken.upsert).toHaveBeenCalledWith({
      where: {
        userId_mcpServerTemplateInstanceId: {
          userId: testUserId,
          mcpServerTemplateInstanceId: testTargetInstanceId,
        },
      },
      create: {
        userId: testUserId,
        mcpServerTemplateInstanceId: testTargetInstanceId,
        oauthClientId: "oauth-client-123",
        organizationId: testOrganizationId,
        accessToken: "access-token-source",
        refreshToken: "refresh-token-source",
        expiresAt: futureDate,
        tokenPurpose: "BACKEND_MCP",
      },
      update: {
        oauthClientId: "oauth-client-123",
        accessToken: "access-token-source",
        refreshToken: "refresh-token-source",
        expiresAt: futureDate,
        tokenPurpose: "BACKEND_MCP",
      },
    });
  });

  test("有効期限がnullのトークンも正常にコピーできる", async () => {
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: testOrganizationId,
      oauthClientId: "oauth-client-123",
      accessToken: "access-token-source",
      refreshToken: "refresh-token-source",
      expiresAt: null,
      tokenPurpose: "BACKEND_MCP" as const,
      oauthClient: {
        clientId: "client-id-123",
        clientSecret: "client-secret-123",
      },
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    const mockTargetInstance = {
      id: testTargetInstanceId,
      mcpServer: {
        id: "target-server-123",
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
      },
    };

    const mockCreatedToken = {
      id: "new-token-456",
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTargetInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.upsert).mockResolvedValue(
      mockCreatedToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.upsert>
      >,
    );

    const result = await reuseOAuthToken(
      mockTx,
      {
        sourceTokenId: testSourceTokenId,
        targetInstanceId: testTargetInstanceId,
      },
      testOrganizationId,
      testUserId,
    );

    expect(result).toStrictEqual({
      success: true,
      tokenId: "new-token-456",
    });

    expect(mockTx.mcpOAuthToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          expiresAt: null,
        }) as Record<string, unknown>,
        update: expect.objectContaining({
          expiresAt: null,
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  test("ソーストークンが見つからない場合はNOT_FOUNDエラーを投げる", async () => {
    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(null);

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: "non-existent-token",
          targetInstanceId: testTargetInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "ソーストークンが見つかりません",
      }),
    );
  });

  test("ソーストークンのuserIdが一致しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: "different-user-id",
      organizationId: testOrganizationId,
      oauthClient: {},
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: testSourceTokenId,
          targetInstanceId: testTargetInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "ソーストークンが見つかりません",
      }),
    );
  });

  test("ソーストークンの組織が一致しない場合はFORBIDDENエラーを投げる", async () => {
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: "different-org-id",
      oauthClient: {},
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: testSourceTokenId,
          targetInstanceId: testTargetInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: "このトークンにアクセスする権限がありません",
      }),
    );
  });

  test("ターゲットインスタンスが見つからない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: testOrganizationId,
      oauthClient: {},
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      null,
    );

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: testSourceTokenId,
          targetInstanceId:
            "non-existent-instance" as McpServerTemplateInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "ターゲットインスタンスが見つかりません",
      }),
    );
  });

  test("ターゲットインスタンスの組織が一致しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: testOrganizationId,
      oauthClient: {},
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    const mockTargetInstance = {
      id: testTargetInstanceId,
      mcpServer: {
        id: "target-server-123",
        organizationId: "different-org-id",
      },
      mcpServerTemplate: {
        id: testTemplateId,
      },
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTargetInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: testSourceTokenId,
          targetInstanceId: testTargetInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "ターゲットインスタンスが見つかりません",
      }),
    );
  });

  test("ソースとターゲットのテンプレートが一致しない場合はBAD_REQUESTエラーを投げる", async () => {
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: testOrganizationId,
      oauthClient: {},
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: "template-A",
        },
      },
    };

    const mockTargetInstance = {
      id: testTargetInstanceId,
      mcpServer: {
        id: "target-server-123",
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: "template-B",
      },
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTargetInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: testSourceTokenId,
          targetInstanceId: testTargetInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "ソースとターゲットのテンプレートが一致しません",
      }),
    );
  });

  test("ソーストークンが有効期限切れの場合はBAD_REQUESTエラーを投げる", async () => {
    const expiredDate = new Date(Date.now() - 3600000);
    const mockSourceToken = {
      id: testSourceTokenId,
      userId: testUserId,
      organizationId: testOrganizationId,
      expiresAt: expiredDate,
      oauthClient: {},
      mcpServerTemplateInstance: {
        mcpServerTemplate: {
          id: testTemplateId,
        },
      },
    };

    const mockTargetInstance = {
      id: testTargetInstanceId,
      mcpServer: {
        id: "target-server-123",
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
      },
    };

    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockSourceToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTargetInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      reuseOAuthToken(
        mockTx,
        {
          sourceTokenId: testSourceTokenId,
          targetInstanceId: testTargetInstanceId,
        },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "ソーストークンは有効期限切れです",
      }),
    );
  });
});
