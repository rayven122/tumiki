import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaTransactionClient } from "@tumiki/db";
import { AuthType, TokenPurpose } from "@tumiki/db/server";
import { copyOAuthTokensForNewInstances } from "./copyOAuthTokens";

// テスト用データ
const mockUserId = "user_123";
const mockOrganizationId = "org_456";
const mockTemplateId = "template_abc";
const mockOAuthClientId = "oauth_client_789";

// Prismaクライアントのモック
const createMockPrismaClient = () => {
  return {
    mcpOAuthToken: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  } as unknown as PrismaTransactionClient;
};

// テスト用インスタンスデータ作成
const createMockInstance = (
  id: string,
  templateId: string,
  authType: AuthType,
) => ({
  id,
  normalizedName: `instance-${id}`,
  mcpServerId: "mcp_server_123",
  mcpServerTemplateId: templateId,
  isEnabled: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  mcpServerTemplate: {
    id: templateId,
    name: "Test Template",
    normalizedName: "test-template",
    description: null,
    tags: [],
    iconPath: null,
    transportType: "STREAMABLE_HTTPS" as const,
    command: null,
    args: [],
    url: "https://example.com/mcp",
    envVarKeys: [],
    authType,
    oauthProvider: authType === AuthType.OAUTH ? "github" : null,
    oauthScopes: [],
    useCloudRunIam: false,
    createdBy: null,
    visibility: "PRIVATE" as const,
    organizationId: mockOrganizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});

// テスト用トークンデータ作成（findMany用にmcpServerTemplateInstanceを含む）
const createMockTokenWithInstance = (
  instanceId: string,
  templateId: string,
) => ({
  id: "token_xyz",
  oauthClientId: mockOAuthClientId,
  mcpServerTemplateInstanceId: instanceId,
  userId: mockUserId,
  organizationId: mockOrganizationId,
  accessToken: "encrypted_access_token",
  refreshToken: "encrypted_refresh_token",
  expiresAt: new Date(Date.now() + 3600000), // 1時間後
  tokenPurpose: TokenPurpose.BACKEND_MCP,
  createdAt: new Date(),
  updatedAt: new Date(),
  mcpServerTemplateInstance: {
    mcpServerTemplateId: templateId,
  },
});

describe("copyOAuthTokensForNewInstances", () => {
  let mockPrisma: PrismaTransactionClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma = createMockPrismaClient();
  });

  test("OAuthタイプのテンプレートで既存トークンがある場合、トークンをコピーする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );
    const existingToken = createMockTokenWithInstance(
      "existing_instance_1",
      mockTemplateId,
    );

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([existingToken]);
    (
      mockPrisma.mcpOAuthToken.createMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ count: 1 });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    // findManyが正しいパラメータで呼ばれることを確認
    expect(mockPrisma.mcpOAuthToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        mcpServerTemplateInstance: {
          mcpServerTemplateId: { in: [mockTemplateId] },
          id: { notIn: [newInstance.id] },
        },
      },
      include: {
        mcpServerTemplateInstance: {
          select: { mcpServerTemplateId: true },
        },
      },
    });

    // createManyが正しいパラメータで呼ばれることを確認
    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledWith({
      data: [
        {
          oauthClientId: existingToken.oauthClientId,
          mcpServerTemplateInstanceId: newInstance.id,
          userId: mockUserId,
          organizationId: mockOrganizationId,
          accessToken: existingToken.accessToken,
          refreshToken: existingToken.refreshToken,
          expiresAt: existingToken.expiresAt,
          tokenPurpose: existingToken.tokenPurpose,
        },
      ],
    });
  });

  test("OAuthタイプのテンプレートで既存トークンがない場合、createManyは呼ばれない", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findMany).toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.createMany).not.toHaveBeenCalled();
  });

  test("API_KEYタイプのテンプレートの場合、トークンコピーをスキップする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.API_KEY,
    );

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.createMany).not.toHaveBeenCalled();
  });

  test("NONEタイプのテンプレートの場合、トークンコピーをスキップする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.NONE,
    );

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.createMany).not.toHaveBeenCalled();
  });

  test("複数のインスタンスがある場合、OAuthタイプのみ処理する", async () => {
    const oauthInstance = createMockInstance(
      "new_instance_oauth",
      "template_oauth",
      AuthType.OAUTH,
    );
    const apiKeyInstance = createMockInstance(
      "new_instance_apikey",
      "template_apikey",
      AuthType.API_KEY,
    );
    const noneInstance = createMockInstance(
      "new_instance_none",
      "template_none",
      AuthType.NONE,
    );
    const existingToken = createMockTokenWithInstance(
      "existing_instance",
      "template_oauth",
    );

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([existingToken]);
    (
      mockPrisma.mcpOAuthToken.createMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ count: 1 });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [oauthInstance, apiKeyInstance, noneInstance],
      mockUserId,
      mockOrganizationId,
    );

    // findManyは1回だけ呼ばれる（OAuthタイプのみ）
    expect(mockPrisma.mcpOAuthToken.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.mcpOAuthToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        mcpServerTemplateInstance: {
          mcpServerTemplateId: { in: ["template_oauth"] },
          id: { notIn: [oauthInstance.id] },
        },
      },
      include: {
        mcpServerTemplateInstance: {
          select: { mcpServerTemplateId: true },
        },
      },
    });
    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledTimes(1);
  });

  test("複数のOAuthインスタンスがある場合、バッチでトークンをコピーする", async () => {
    const oauthInstance1 = createMockInstance(
      "new_instance_1",
      "template_oauth_1",
      AuthType.OAUTH,
    );
    const oauthInstance2 = createMockInstance(
      "new_instance_2",
      "template_oauth_2",
      AuthType.OAUTH,
    );
    const existingToken1 = createMockTokenWithInstance(
      "existing_1",
      "template_oauth_1",
    );
    const existingToken2 = createMockTokenWithInstance(
      "existing_2",
      "template_oauth_2",
    );

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([existingToken1, existingToken2]);
    (
      mockPrisma.mcpOAuthToken.createMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ count: 2 });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [oauthInstance1, oauthInstance2],
      mockUserId,
      mockOrganizationId,
    );

    // findManyは1回だけ呼ばれる（バッチ処理）
    expect(mockPrisma.mcpOAuthToken.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.mcpOAuthToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        mcpServerTemplateInstance: {
          mcpServerTemplateId: { in: ["template_oauth_1", "template_oauth_2"] },
          id: { notIn: [oauthInstance1.id, oauthInstance2.id] },
        },
      },
      include: {
        mcpServerTemplateInstance: {
          select: { mcpServerTemplateId: true },
        },
      },
    });
    // createManyも1回だけ呼ばれる（バッチ処理）
    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.arrayContaining([
        expect.objectContaining({
          mcpServerTemplateInstanceId: oauthInstance1.id,
        }),
        expect.objectContaining({
          mcpServerTemplateInstanceId: oauthInstance2.id,
        }),
      ]),
    });
  });

  test("空のインスタンス配列の場合、何も処理しない", async () => {
    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.createMany).not.toHaveBeenCalled();
  });

  test("refreshTokenがnullの場合も正しくコピーする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );
    const existingToken = {
      ...createMockTokenWithInstance("existing_instance_1", mockTemplateId),
      refreshToken: null,
    };

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([existingToken]);
    (
      mockPrisma.mcpOAuthToken.createMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ count: 1 });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledWith({
      data: [
        {
          oauthClientId: existingToken.oauthClientId,
          mcpServerTemplateInstanceId: newInstance.id,
          userId: mockUserId,
          organizationId: mockOrganizationId,
          accessToken: existingToken.accessToken,
          refreshToken: null,
          expiresAt: existingToken.expiresAt,
          tokenPurpose: existingToken.tokenPurpose,
        },
      ],
    });
  });

  test("expiresAtがnullの場合も正しくコピーする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );
    const existingToken = {
      ...createMockTokenWithInstance("existing_instance_1", mockTemplateId),
      expiresAt: null,
    };

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([existingToken]);
    (
      mockPrisma.mcpOAuthToken.createMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ count: 1 });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledWith({
      data: [
        {
          oauthClientId: existingToken.oauthClientId,
          mcpServerTemplateInstanceId: newInstance.id,
          userId: mockUserId,
          organizationId: mockOrganizationId,
          accessToken: existingToken.accessToken,
          refreshToken: existingToken.refreshToken,
          expiresAt: null,
          tokenPurpose: existingToken.tokenPurpose,
        },
      ],
    });
  });

  test("一部のテンプレートにのみ既存トークンがある場合、存在するものだけコピーする", async () => {
    const oauthInstance1 = createMockInstance(
      "new_instance_1",
      "template_oauth_1",
      AuthType.OAUTH,
    );
    const oauthInstance2 = createMockInstance(
      "new_instance_2",
      "template_oauth_2",
      AuthType.OAUTH,
    );
    // template_oauth_1のトークンのみ存在
    const existingToken1 = createMockTokenWithInstance(
      "existing_1",
      "template_oauth_1",
    );

    (
      mockPrisma.mcpOAuthToken.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([existingToken1]);
    (
      mockPrisma.mcpOAuthToken.createMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ count: 1 });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [oauthInstance1, oauthInstance2],
      mockUserId,
      mockOrganizationId,
    );

    // template_oauth_1のトークンのみコピーされる
    expect(mockPrisma.mcpOAuthToken.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          mcpServerTemplateInstanceId: oauthInstance1.id,
        }),
      ],
    });
  });
});
