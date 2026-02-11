import { describe, test, expect, beforeEach, vi } from "vitest";
import { findMcpServers } from "../findMcpServers";
import type { PrismaTransactionClient } from "@tumiki/db";
import { ServerStatus, ServerType, AuthType } from "@tumiki/db/prisma";

describe("findMcpServers", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testUserId = "user-123";

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      mcpOAuthToken: {
        findMany: vi.fn(),
      },
      mcpServer: {
        findMany: vi.fn(),
      },
      mcpServerRequestLog: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("OAuth認証済みユーザーの場合、isOAuthAuthenticatedがtrueになる", async () => {
    const templateInstanceId = "instance-123";

    // OAuthトークンが存在する
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue([
      { mcpServerTemplateInstanceId: templateInstanceId },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpOAuthToken.findMany>>);

    // OAuthサーバーをセットアップ
    vi.mocked(mockTx.mcpServer.findMany).mockResolvedValue([
      {
        id: "server-123",
        name: "Test Server",
        description: "テストサーバー",
        iconPath: null,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.OAUTH,
        organizationId: testOrganizationId,
        displayOrder: 0,
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
        dynamicSearch: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        apiKeys: [],
        templateInstances: [
          {
            id: templateInstanceId,
            normalizedName: "github",
            mcpServerId: "server-123",
            mcpServerTemplateId: "template-123",
            isEnabled: true,
            displayOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-123",
              name: "GitHub",
              description: "GitHub MCP",
              url: "https://github.com",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.OAUTH,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findMany>>);

    const result = await findMcpServers(mockTx, {
      organizationId: testOrganizationId,
      userId: testUserId,
    });

    expect(result).toHaveLength(1);
    const server = result[0];
    expect(server).toBeDefined();
    const instance = server?.templateInstances[0];
    expect(instance).toBeDefined();
    expect(instance?.isOAuthAuthenticated).toBe(true);
    expect(server?.allOAuthAuthenticated).toBe(true);
  });

  test("OAuth未認証ユーザーの場合、isOAuthAuthenticatedがfalseになる", async () => {
    const templateInstanceId = "instance-456";

    // OAuthトークンが存在しない
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findMany>
      >,
    );

    // OAuthサーバーをセットアップ
    vi.mocked(mockTx.mcpServer.findMany).mockResolvedValue([
      {
        id: "server-456",
        name: "Test Server",
        description: "テストサーバー",
        iconPath: null,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.OAUTH,
        organizationId: testOrganizationId,
        displayOrder: 0,
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
        dynamicSearch: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        apiKeys: [],
        templateInstances: [
          {
            id: templateInstanceId,
            normalizedName: "notion",
            mcpServerId: "server-456",
            mcpServerTemplateId: "template-456",
            isEnabled: true,
            displayOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-456",
              name: "Notion",
              description: "Notion MCP",
              url: "https://notion.so",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.OAUTH,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findMany>>);

    const result = await findMcpServers(mockTx, {
      organizationId: testOrganizationId,
      userId: testUserId,
    });

    expect(result).toHaveLength(1);
    const server = result[0];
    expect(server).toBeDefined();
    const instance = server?.templateInstances[0];
    expect(instance).toBeDefined();
    expect(instance?.isOAuthAuthenticated).toBe(false);
    expect(server?.allOAuthAuthenticated).toBe(false);
  });

  test("APIキー認証サーバーの場合、isOAuthAuthenticatedがnullになる", async () => {
    // OAuthトークンが存在しない
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findMany>
      >,
    );

    // APIキー認証サーバーをセットアップ
    vi.mocked(mockTx.mcpServer.findMany).mockResolvedValue([
      {
        id: "server-789",
        name: "API Key Server",
        description: "APIキーサーバー",
        iconPath: null,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.API_KEY,
        organizationId: testOrganizationId,
        displayOrder: 0,
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
        dynamicSearch: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        apiKeys: [],
        templateInstances: [
          {
            id: "instance-789",
            normalizedName: "openai",
            mcpServerId: "server-789",
            mcpServerTemplateId: "template-789",
            isEnabled: true,
            displayOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-789",
              name: "OpenAI",
              description: "OpenAI MCP",
              url: "https://api.openai.com",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.API_KEY,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findMany>>);

    const result = await findMcpServers(mockTx, {
      organizationId: testOrganizationId,
      userId: testUserId,
    });

    expect(result).toHaveLength(1);
    const server = result[0];
    expect(server).toBeDefined();
    const instance = server?.templateInstances[0];
    expect(instance).toBeDefined();
    expect(instance?.isOAuthAuthenticated).toBeNull();
    expect(server?.allOAuthAuthenticated).toBeNull();
  });

  test("統合MCPサーバーで一部のみ認証済みの場合、allOAuthAuthenticatedがfalseになる", async () => {
    const authenticatedInstanceId = "instance-oauth-1";
    const unauthenticatedInstanceId = "instance-oauth-2";

    // 1つのインスタンスのみ認証済み
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue([
      { mcpServerTemplateInstanceId: authenticatedInstanceId },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpOAuthToken.findMany>>);

    // 統合MCPサーバーをセットアップ（2つのOAuthテンプレート）
    vi.mocked(mockTx.mcpServer.findMany).mockResolvedValue([
      {
        id: "server-integrated",
        name: "Integrated Server",
        description: "統合サーバー",
        iconPath: null,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.CUSTOM,
        authType: AuthType.OAUTH,
        organizationId: testOrganizationId,
        displayOrder: 0,
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
        dynamicSearch: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        apiKeys: [],
        templateInstances: [
          {
            id: authenticatedInstanceId,
            normalizedName: "github",
            mcpServerId: "server-integrated",
            mcpServerTemplateId: "template-github",
            isEnabled: true,
            displayOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-github",
              name: "GitHub",
              description: "GitHub MCP",
              url: "https://github.com",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.OAUTH,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
          {
            id: unauthenticatedInstanceId,
            normalizedName: "notion",
            mcpServerId: "server-integrated",
            mcpServerTemplateId: "template-notion",
            isEnabled: true,
            displayOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-notion",
              name: "Notion",
              description: "Notion MCP",
              url: "https://notion.so",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.OAUTH,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findMany>>);

    const result = await findMcpServers(mockTx, {
      organizationId: testOrganizationId,
      userId: testUserId,
    });

    expect(result).toHaveLength(1);
    const server = result[0];
    expect(server).toBeDefined();
    const instance0 = server?.templateInstances[0];
    const instance1 = server?.templateInstances[1];
    expect(instance0).toBeDefined();
    expect(instance1).toBeDefined();
    expect(instance0?.isOAuthAuthenticated).toBe(true);
    expect(instance1?.isOAuthAuthenticated).toBe(false);
    expect(server?.allOAuthAuthenticated).toBe(false);
  });

  test("統合MCPサーバーで全て認証済みの場合、allOAuthAuthenticatedがtrueになる", async () => {
    const instanceId1 = "instance-oauth-1";
    const instanceId2 = "instance-oauth-2";

    // 両方のインスタンスが認証済み
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue([
      { mcpServerTemplateInstanceId: instanceId1 },
      { mcpServerTemplateInstanceId: instanceId2 },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpOAuthToken.findMany>>);

    // 統合MCPサーバーをセットアップ（2つのOAuthテンプレート）
    vi.mocked(mockTx.mcpServer.findMany).mockResolvedValue([
      {
        id: "server-integrated",
        name: "Integrated Server",
        description: "統合サーバー",
        iconPath: null,
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.CUSTOM,
        authType: AuthType.OAUTH,
        organizationId: testOrganizationId,
        displayOrder: 0,
        piiMaskingMode: "DISABLED",
        piiInfoTypes: [],
        toonConversionEnabled: false,
        dynamicSearch: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        apiKeys: [],
        templateInstances: [
          {
            id: instanceId1,
            normalizedName: "github",
            mcpServerId: "server-integrated",
            mcpServerTemplateId: "template-github",
            isEnabled: true,
            displayOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-github",
              name: "GitHub",
              description: "GitHub MCP",
              url: "https://github.com",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.OAUTH,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
          {
            id: instanceId2,
            normalizedName: "notion",
            mcpServerId: "server-integrated",
            mcpServerTemplateId: "template-notion",
            isEnabled: true,
            displayOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            allowedTools: [],
            mcpServerTemplate: {
              id: "template-notion",
              name: "Notion",
              description: "Notion MCP",
              url: "https://notion.so",
              iconPath: null,
              tags: [],
              command: null,
              args: [],
              authType: AuthType.OAUTH,
              transportType: "HTTP",
              isOfficial: true,
              envVarsDefinition: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              mcpTools: [],
            },
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findMany>>);

    const result = await findMcpServers(mockTx, {
      organizationId: testOrganizationId,
      userId: testUserId,
    });

    expect(result).toHaveLength(1);
    const server = result[0];
    expect(server).toBeDefined();
    const instance0 = server?.templateInstances[0];
    const instance1 = server?.templateInstances[1];
    expect(instance0).toBeDefined();
    expect(instance1).toBeDefined();
    expect(instance0?.isOAuthAuthenticated).toBe(true);
    expect(instance1?.isOAuthAuthenticated).toBe(true);
    expect(server?.allOAuthAuthenticated).toBe(true);
  });

  test("OAuthトークン取得時に正しいパラメータが渡される", async () => {
    vi.mocked(mockTx.mcpOAuthToken.findMany).mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof mockTx.mcpOAuthToken.findMany>
      >,
    );
    vi.mocked(mockTx.mcpServer.findMany).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findMany>>,
    );

    await findMcpServers(mockTx, {
      organizationId: testOrganizationId,
      userId: testUserId,
    });

    expect(mockTx.mcpOAuthToken.findMany).toHaveBeenCalledWith({
      where: { userId: testUserId, organizationId: testOrganizationId },
      select: { mcpServerTemplateInstanceId: true, expiresAt: true },
    });
  });
});
