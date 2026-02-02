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
      findFirst: vi.fn(),
      create: vi.fn(),
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

// テスト用トークンデータ作成
const createMockToken = (instanceId: string) => ({
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
    const existingToken = createMockToken("existing_instance_1");

    (
      mockPrisma.mcpOAuthToken.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(existingToken);
    (
      mockPrisma.mcpOAuthToken.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...existingToken,
      id: "new_token_id",
      mcpServerTemplateInstanceId: newInstance.id,
    });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    // findFirstが正しいパラメータで呼ばれることを確認
    expect(mockPrisma.mcpOAuthToken.findFirst).toHaveBeenCalledWith({
      where: {
        userId: mockUserId,
        mcpServerTemplateInstance: {
          mcpServerTemplateId: mockTemplateId,
          id: { not: newInstance.id },
        },
      },
    });

    // createが正しいパラメータで呼ばれることを確認
    expect(mockPrisma.mcpOAuthToken.create).toHaveBeenCalledWith({
      data: {
        oauthClientId: existingToken.oauthClientId,
        mcpServerTemplateInstanceId: newInstance.id,
        userId: mockUserId,
        organizationId: mockOrganizationId,
        accessToken: existingToken.accessToken,
        refreshToken: existingToken.refreshToken,
        expiresAt: existingToken.expiresAt,
        tokenPurpose: existingToken.tokenPurpose,
      },
    });
  });

  test("OAuthタイプのテンプレートで既存トークンがない場合、何もしない", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );

    (
      mockPrisma.mcpOAuthToken.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findFirst).toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.create).not.toHaveBeenCalled();
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

    expect(mockPrisma.mcpOAuthToken.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.create).not.toHaveBeenCalled();
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

    expect(mockPrisma.mcpOAuthToken.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.create).not.toHaveBeenCalled();
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
    const existingToken = createMockToken("existing_instance");

    (
      mockPrisma.mcpOAuthToken.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(existingToken);
    (
      mockPrisma.mcpOAuthToken.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...existingToken,
      id: "new_token_id",
    });

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [oauthInstance, apiKeyInstance, noneInstance],
      mockUserId,
      mockOrganizationId,
    );

    // findFirstは1回だけ呼ばれる（OAuthタイプのみ）
    expect(mockPrisma.mcpOAuthToken.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.mcpOAuthToken.create).toHaveBeenCalledTimes(1);
  });

  test("複数のOAuthインスタンスがある場合、それぞれのトークンをコピーする", async () => {
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
    const existingToken1 = createMockToken("existing_1");
    const existingToken2 = createMockToken("existing_2");

    (mockPrisma.mcpOAuthToken.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(existingToken1)
      .mockResolvedValueOnce(existingToken2);
    (
      mockPrisma.mcpOAuthToken.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [oauthInstance1, oauthInstance2],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findFirst).toHaveBeenCalledTimes(2);
    expect(mockPrisma.mcpOAuthToken.create).toHaveBeenCalledTimes(2);
  });

  test("空のインスタンス配列の場合、何も処理しない", async () => {
    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.mcpOAuthToken.create).not.toHaveBeenCalled();
  });

  test("refreshTokenがnullの場合も正しくコピーする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );
    const existingToken = {
      ...createMockToken("existing_instance_1"),
      refreshToken: null,
    };

    (
      mockPrisma.mcpOAuthToken.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(existingToken);
    (
      mockPrisma.mcpOAuthToken.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.create).toHaveBeenCalledWith({
      data: {
        oauthClientId: existingToken.oauthClientId,
        mcpServerTemplateInstanceId: newInstance.id,
        userId: mockUserId,
        organizationId: mockOrganizationId,
        accessToken: existingToken.accessToken,
        refreshToken: null,
        expiresAt: existingToken.expiresAt,
        tokenPurpose: existingToken.tokenPurpose,
      },
    });
  });

  test("expiresAtがnullの場合も正しくコピーする", async () => {
    const newInstance = createMockInstance(
      "new_instance_1",
      mockTemplateId,
      AuthType.OAUTH,
    );
    const existingToken = {
      ...createMockToken("existing_instance_1"),
      expiresAt: null,
    };

    (
      mockPrisma.mcpOAuthToken.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(existingToken);
    (
      mockPrisma.mcpOAuthToken.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    await copyOAuthTokensForNewInstances(
      mockPrisma,
      [newInstance],
      mockUserId,
      mockOrganizationId,
    );

    expect(mockPrisma.mcpOAuthToken.create).toHaveBeenCalledWith({
      data: {
        oauthClientId: existingToken.oauthClientId,
        mcpServerTemplateInstanceId: newInstance.id,
        userId: mockUserId,
        organizationId: mockOrganizationId,
        accessToken: existingToken.accessToken,
        refreshToken: existingToken.refreshToken,
        expiresAt: null,
        tokenPurpose: existingToken.tokenPurpose,
      },
    });
  });
});
