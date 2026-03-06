import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { reauthenticateOAuthMcpServer } from "../reauthenticateOAuthMcpServer";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerTemplateInstanceId } from "@/schema/ids";
import type {
  McpServer,
  McpServerTemplate,
  McpServerTemplateInstance,
} from "@tumiki/db/server";

// テスト用のモック型定義
type MockMcpServerTemplate = Pick<McpServerTemplate, "id" | "url" | "authType">;

type MockMcpServer = Pick<McpServer, "id" | "organizationId">;

type MockMcpServerTemplateInstance = Pick<McpServerTemplateInstance, "id"> & {
  mcpServer: MockMcpServer;
  mcpServerTemplate: MockMcpServerTemplate;
};

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

describe("reauthenticateOAuthMcpServer", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";
  const testTemplateInstanceId = "instance-123" as McpServerTemplateInstanceId;
  const testMcpServerId = "mcp-server-123";
  const testTemplateId = "template-123";

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      mcpServerTemplateInstance: {
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

  test("既存のMCPサーバーに対してAuthorization URLを生成する", async () => {
    // モックデータのセットアップ
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        url: "https://mcp.example.com",
        authType: "OAUTH" as const,
      },
    } as MockMcpServerTemplateInstance;

    const mockOAuthToken = {
      id: "oauth-token-123",
      oauthClientId: "oauth-client-123",
      mcpServerTemplateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      expiresAt: new Date(Date.now() + 3600000),
      tokenPurpose: "BACKEND_MCP" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      oauthClient: {
        clientId: "client-id-123",
        clientSecret: "client-secret-123",
      },
    };

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(
      mockOAuthToken as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findUnique>
      >,
    );

    // 実行
    const result = await reauthenticateOAuthMcpServer(
      mockTx,
      { mcpServerTemplateInstanceId: testTemplateInstanceId },
      testOrganizationId,
      testUserId,
    );

    // 検証
    expect(result).toStrictEqual({
      authorizationUrl: "https://auth.example.com/authorize?code=test",
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
            url: true,
            authType: true,
          },
        },
      },
    });

    expect(mockTx.mcpOAuthToken.findUnique).toHaveBeenCalledWith({
      where: {
        userId_mcpServerTemplateInstanceId: {
          userId: testUserId,
          mcpServerTemplateInstanceId: testTemplateInstanceId,
        },
      },
      include: {
        oauthClient: {
          select: {
            clientId: true,
            clientSecret: true,
          },
        },
      },
    });
  });

  test("存在しないテンプレートインスタンスIDの場合はNOT_FOUNDエラーを投げる", async () => {
    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      null,
    );

    await expect(
      reauthenticateOAuthMcpServer(
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
        url: "https://mcp.example.com",
        authType: "OAUTH" as const,
      },
    } as MockMcpServerTemplateInstance;

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      reauthenticateOAuthMcpServer(
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

  test("OAuth認証に対応していないサーバーの場合はBAD_REQUESTエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        url: "https://mcp.example.com",
        authType: "API_KEY" as const, // OAuth以外
      },
    } as MockMcpServerTemplateInstance;

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      reauthenticateOAuthMcpServer(
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

  test("テンプレートURLが存在しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        url: null, // URLが存在しない
        authType: "OAUTH" as const,
      },
    } as MockMcpServerTemplateInstance;

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );

    await expect(
      reauthenticateOAuthMcpServer(
        mockTx,
        { mcpServerTemplateInstanceId: testTemplateInstanceId },
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
    const mockTemplateInstance = {
      id: testTemplateInstanceId,
      mcpServer: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
      },
      mcpServerTemplate: {
        id: testTemplateId,
        url: "https://mcp.example.com",
        authType: "OAUTH" as const,
      },
    } as MockMcpServerTemplateInstance;

    vi.mocked(mockTx.mcpServerTemplateInstance.findUnique).mockResolvedValue(
      mockTemplateInstance as unknown as Awaited<
        ReturnType<typeof mockTx.mcpServerTemplateInstance.findUnique>
      >,
    );
    // トークンがない場合、組織のOAuthClientを取得しようとする
    vi.mocked(mockTx.mcpOAuthToken.findUnique).mockResolvedValue(null);
    vi.mocked(mockTx.mcpOAuthClient.findFirst).mockResolvedValue(null);

    await expect(
      reauthenticateOAuthMcpServer(
        mockTx,
        { mcpServerTemplateInstanceId: testTemplateInstanceId },
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
