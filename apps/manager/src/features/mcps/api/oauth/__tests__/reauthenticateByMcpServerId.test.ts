import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { reauthenticateByMcpServerId } from "../reauthenticateByMcpServerId";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

// generateAuthorizationUrlヘルパーをモック
vi.mock("../../helpers/generateAuthorizationUrl", () => ({
  generateAuthorizationUrl: vi
    .fn()
    .mockResolvedValue("https://auth.example.com/authorize?code=test"),
}));

// discoverOAuthMetadataをモック
vi.mock("@/lib/oauth/dcr", () => ({
  discoverOAuthMetadata: vi.fn().mockResolvedValue({
    authorization_endpoint: "https://auth.example.com/authorize",
    token_endpoint: "https://auth.example.com/token",
    scopes_supported: ["read", "write"],
  }),
}));

describe("reauthenticateByMcpServerId", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testMcpServerId = "mcp-server-123" as McpServerId;
  const testTemplateInstanceId = "instance-123";
  const testTemplateId = "template-123";

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      mcpServer: {
        findUnique: vi.fn(),
      },
      mcpOAuthToken: {
        findUnique: vi.fn(),
      },
      mcpOAuthClient: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("mcpServerIdからAuthorization URLを生成する", async () => {
    // モックデータのセットアップ
    const mockMcpServer = {
      id: testMcpServerId,
      templateInstances: [
        {
          id: testTemplateInstanceId,
          mcpServerTemplate: {
            id: testTemplateId,
            url: "https://mcp.example.com",
            authType: "OAUTH",
          },
        },
      ],
    };

    const mockOAuthToken = {
      id: "oauth-token-123",
      oauthClientId: "oauth-client-123",
      mcpServerTemplateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      expiresAt: new Date(Date.now() + 3600000),
      tokenPurpose: "BACKEND_MCP",
      createdAt: new Date(),
      updatedAt: new Date(),
      oauthClient: {
        clientId: "client-id-123",
        clientSecret: "client-secret-123",
      },
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(
      mockMcpServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockOAuthToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );

    // 実行
    const result = await reauthenticateByMcpServerId(
      mockTx,
      { mcpServerId: testMcpServerId },
      testOrganizationId,
      testUserId,
    );

    // 検証
    expect(result).toStrictEqual({
      authorizationUrl: "https://auth.example.com/authorize?code=test",
    });

    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        templateInstances: {
          where: {
            isEnabled: true,
            mcpServerTemplate: {
              authType: "OAUTH",
            },
          },
          select: {
            id: true,
            mcpServerTemplate: {
              select: {
                id: true,
                url: true,
                authType: true,
              },
            },
          },
          take: 1,
        },
      },
    });
  });

  test("存在しないmcpServerIdの場合はNOT_FOUNDエラーを投げる", async () => {
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    await expect(
      reauthenticateByMcpServerId(
        mockTx,
        { mcpServerId: "non-existent-id" as McpServerId },
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

  test("OAuth認証が必要なテンプレートがない場合はBAD_REQUESTエラーを投げる", async () => {
    const mockMcpServer = {
      id: testMcpServerId,
      templateInstances: [], // 空のリスト
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(
      mockMcpServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.findUnique>
      >,
    );

    await expect(
      reauthenticateByMcpServerId(
        mockTx,
        { mcpServerId: testMcpServerId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "このサーバーにはOAuth認証が必要なテンプレートがありません",
      }),
    );
  });

  test("テンプレートURLが存在しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockMcpServer = {
      id: testMcpServerId,
      templateInstances: [
        {
          id: testTemplateInstanceId,
          mcpServerTemplate: {
            id: testTemplateId,
            url: null, // URLが存在しない
            authType: "OAUTH",
          },
        },
      ],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(
      mockMcpServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.findUnique>
      >,
    );

    await expect(
      reauthenticateByMcpServerId(
        mockTx,
        { mcpServerId: testMcpServerId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "MCPサーバーテンプレートのURLが見つかりません",
      }),
    );
  });

  test("OAuthトークンもOAuthクライアントも存在しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockMcpServer = {
      id: testMcpServerId,
      templateInstances: [
        {
          id: testTemplateInstanceId,
          mcpServerTemplate: {
            id: testTemplateId,
            url: "https://mcp.example.com",
            authType: "OAUTH",
          },
        },
      ],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(
      mockMcpServer as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServer.findUnique>
      >,
    );
    // トークンがない場合、組織のOAuthClientを取得しようとする
    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(null);
    vi.mocked(mockTx.mcpOAuthClient.findFirst).mockResolvedValue(null);

    await expect(
      reauthenticateByMcpServerId(
        mockTx,
        { mcpServerId: testMcpServerId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message:
          "この組織にはOAuth設定がありません。管理者に連絡してください。",
      }),
    );
  });
});
