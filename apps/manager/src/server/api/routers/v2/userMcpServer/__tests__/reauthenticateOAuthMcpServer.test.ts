import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { reauthenticateOAuthMcpServer } from "../reauthenticateOAuthMcpServer";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";
import type { McpServer, McpServerTemplate } from "@tumiki/db/server";
import { ServerStatus } from "@tumiki/db/prisma";

// テスト用のモック型定義
type MockMcpServerTemplate = Pick<McpServerTemplate, "id" | "url" | "authType">;

type MockMcpServer = Pick<
  McpServer,
  | "id"
  | "name"
  | "description"
  | "iconPath"
  | "serverStatus"
  | "serverType"
  | "authType"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "organizationId"
  | "displayOrder"
> & {
  mcpServers: MockMcpServerTemplate[];
};

// generateAuthorizationUrlヘルパーをモック
vi.mock("../helpers/generateAuthorizationUrl", () => ({
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
  const testMcpServerId = "mcp-server-123" as McpServerId;
  const testTemplateId = "template-123";

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      mcpServer: {
        findUnique: vi.fn(),
      },
      mcpOAuthClient: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("既存のMCPサーバーに対してAuthorization URLを生成する", async () => {
    // モックデータのセットアップ
    const mockMcpServer: MockMcpServer = {
      id: testMcpServerId,
      name: "Test MCP Server",
      description: "Test Description",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: "OFFICIAL" as const,
      authType: "OAUTH" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      organizationId: testOrganizationId,
      displayOrder: 0,
      mcpServers: [
        {
          id: testTemplateId,
          url: "https://mcp.example.com",
          authType: "OAUTH" as const,
        },
      ],
    };

    const mockOAuthClient = {
      id: "oauth-client-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId: testOrganizationId,
      mcpServerTemplateId: testTemplateId,
      clientId: "client-id-123",
      clientSecret: "client-secret-123",
      registrationAccessToken: null,
      registrationClientUri: null,
      authorizationServerUrl: "https://auth.example.com",
      redirectUris: [],
      oauthTokens: [],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(mockMcpServer);
    vi.mocked(mockTx.mcpOAuthClient.findFirst).mockResolvedValue(
      mockOAuthClient,
    );

    // 実行
    const result = await reauthenticateOAuthMcpServer(
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
      where: { id: testMcpServerId },
      include: {
        mcpServers: {
          select: {
            id: true,
            url: true,
            authType: true,
          },
          take: 1,
        },
      },
    });

    expect(mockTx.mcpOAuthClient.findFirst).toHaveBeenCalledWith({
      where: {
        mcpServerTemplateId: testTemplateId,
        organizationId: testOrganizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  test("存在しないMCPサーバーIDの場合はNOT_FOUNDエラーを投げる", async () => {
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    await expect(
      reauthenticateOAuthMcpServer(
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

  test("組織IDが一致しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockMcpServer: MockMcpServer = {
      id: testMcpServerId,
      name: "Test Server",
      description: "",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: "OFFICIAL" as const,
      authType: "OAUTH" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      organizationId: "different-org-id",
      displayOrder: 0,
      mcpServers: [],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(mockMcpServer);

    await expect(
      reauthenticateOAuthMcpServer(
        mockTx,
        { mcpServerId: testMcpServerId },
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
    const mockMcpServer: MockMcpServer = {
      id: testMcpServerId,
      name: "Test Server",
      description: "",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: "OFFICIAL" as const,
      authType: "API_KEY" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      organizationId: testOrganizationId,
      displayOrder: 0,
      mcpServers: [
        {
          id: testTemplateId,
          url: "https://mcp.example.com",
          authType: "API_KEY" as const, // OAuth以外
        },
      ],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(mockMcpServer);

    await expect(
      reauthenticateOAuthMcpServer(
        mockTx,
        { mcpServerId: testMcpServerId },
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
    const mockMcpServer: MockMcpServer = {
      id: testMcpServerId,
      name: "Test Server",
      description: "",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: "OFFICIAL" as const,
      authType: "OAUTH" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      organizationId: testOrganizationId,
      displayOrder: 0,
      mcpServers: [
        {
          id: testTemplateId,
          url: null, // URLが存在しない
          authType: "OAUTH" as const,
        },
      ],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(mockMcpServer);

    await expect(
      reauthenticateOAuthMcpServer(
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

  test("OAuthクライアント情報が存在しない場合はNOT_FOUNDエラーを投げる", async () => {
    const mockMcpServer: MockMcpServer = {
      id: testMcpServerId,
      name: "Test Server",
      description: "",
      iconPath: null,
      serverStatus: ServerStatus.RUNNING,
      serverType: "OFFICIAL" as const,
      authType: "OAUTH" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      organizationId: testOrganizationId,
      displayOrder: 0,
      mcpServers: [
        {
          id: testTemplateId,
          url: "https://mcp.example.com",
          authType: "OAUTH" as const,
        },
      ],
    };

    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(mockMcpServer);
    vi.mocked(mockTx.mcpOAuthClient.findFirst).mockResolvedValue(null);

    await expect(
      reauthenticateOAuthMcpServer(
        mockTx,
        { mcpServerId: testMcpServerId },
        testOrganizationId,
        testUserId,
      ),
    ).rejects.toThrow(
      new TRPCError({
        code: "NOT_FOUND",
        message: "OAuth設定が見つかりません。サーバーを再度追加してください。",
      }),
    );
  });
});
