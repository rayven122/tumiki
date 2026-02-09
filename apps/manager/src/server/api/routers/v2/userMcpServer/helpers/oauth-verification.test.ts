import { describe, test, expect, beforeEach, vi } from "vitest";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TransportType, ServerStatus } from "@tumiki/db/prisma";
import {
  verifyOAuthState,
  getMcpServerAndOAuthClient,
  exchangeAuthorizationCode,
} from "./oauth-verification";
import * as stateToken from "@/lib/oauth/state-token";
import * as oauthClient from "@/lib/oauth/oauth-client";
import * as dcr from "@/lib/oauth/dcr";
import * as oauth from "oauth4webapi";

// モック設定
vi.mock("@/lib/oauth/state-token");
vi.mock("@/lib/oauth/oauth-client");
vi.mock("@/lib/oauth/dcr");
vi.mock("oauth4webapi");

const mockVerifyStateToken = vi.mocked(stateToken.verifyStateToken);
const mockExchangeCodeForToken = vi.mocked(oauthClient.exchangeCodeForToken);
const mockDiscoverOAuthMetadata = vi.mocked(dcr.discoverOAuthMetadata);
const mockValidateAuthResponse = vi.mocked(oauth.validateAuthResponse);

// テスト用データ
const mockUserId = "user_123";
const mockOrganizationId = "org_456";
const mockMcpServerId = "mcp_789";
const mockMcpServerTemplateInstanceId = "instance_abc";
const mockStateToken = "valid-state-token";

const createMockStatePayload = () => ({
  state: "state-123",
  codeVerifier: "verifier-abc",
  codeChallenge: "challenge-xyz",
  nonce: "nonce-456",
  mcpServerId: mockMcpServerId,
  mcpServerTemplateInstanceId: mockMcpServerTemplateInstanceId,
  userId: mockUserId,
  organizationId: mockOrganizationId,
  redirectUri: "https://example.com/callback",
  requestedScopes: ["read", "write"],
  expiresAt: Date.now() + 10 * 60 * 1000,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
});

// Prismaクライアントのモック
const createMockPrismaClient = () => {
  return {
    mcpServer: {
      findUnique: vi.fn(),
    },
    mcpServerTemplateInstance: {
      findUniqueOrThrow: vi.fn(),
    },
    mcpOAuthClient: {
      findFirst: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaTransactionClient;
};

describe("verifyOAuthState", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("有効なstateトークンを正常に検証する", async () => {
    const mockPayload = createMockStatePayload();
    mockVerifyStateToken.mockResolvedValue(mockPayload);

    const result = await verifyOAuthState(mockStateToken, mockUserId);

    expect(result).toStrictEqual(mockPayload);
    expect(mockVerifyStateToken).toHaveBeenCalledWith(mockStateToken);
  });

  test("無効なstateトークンでエラーを投げる", async () => {
    mockVerifyStateToken.mockRejectedValue(new Error("Invalid token"));

    await expect(verifyOAuthState("invalid-token", mockUserId)).rejects.toThrow(
      "Invalid state token",
    );

    expect(mockVerifyStateToken).toHaveBeenCalledWith("invalid-token");
  });

  test("ユーザーIDが一致しない場合にエラーを投げる", async () => {
    const mockPayload = createMockStatePayload();
    mockVerifyStateToken.mockResolvedValue(mockPayload);

    await expect(
      verifyOAuthState(mockStateToken, "different-user-id"),
    ).rejects.toThrow("Authentication failed");
  });

  test("state token検証時の一般的なエラーを適切にハンドリングする", async () => {
    mockVerifyStateToken.mockRejectedValue("Unknown error");

    await expect(verifyOAuthState(mockStateToken, mockUserId)).rejects.toThrow(
      "Invalid state token",
    );
  });
});

describe("getMcpServerAndOAuthClient", () => {
  let mockTx: PrismaTransactionClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockTx = createMockPrismaClient();
  });

  test("MCPサーバーとOAuthクライアントを正常に取得する", async () => {
    // MCPサーバーテンプレートインスタンスのモックデータ
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: mockOrganizationId,
        serverStatus: ServerStatus.PENDING,
      },
      mcpServerTemplate: {
        id: "template_123",
        url: "https://example.com/mcp",
        transportType: TransportType.STREAMABLE_HTTPS,
      },
    };

    // OAuthクライアントのモックデータ
    const mockOAuthClient = {
      id: "oauth_client_123",
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };

    // 組織のモックデータ
    const mockOrganization = {
      slug: "test-org",
    };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);
    (
      mockTx.mcpOAuthClient.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockOAuthClient);
    (
      mockTx.organization.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockOrganization);

    const result = await getMcpServerAndOAuthClient(
      mockTx,
      mockMcpServerTemplateInstanceId,
      mockOrganizationId,
    );

    expect(result).toStrictEqual({
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        templateUrl: "https://example.com/mcp",
        transportType: TransportType.STREAMABLE_HTTPS,
        serverStatus: ServerStatus.PENDING,
      },
      mcpServerTemplateId: "template_123",
      mcpServerTemplateInstanceId: mockMcpServerTemplateInstanceId,
      oauthClient: mockOAuthClient,
      organization: mockOrganization,
    });
  });

  test("MCPサーバーが存在しない場合にエラーを投げる", async () => {
    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockRejectedValue(new Error("Record not found"));

    await expect(
      getMcpServerAndOAuthClient(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      ),
    ).rejects.toThrow();
  });

  test("MCPサーバーテンプレートが存在しない場合にエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: mockOrganizationId,
      },
      mcpServerTemplate: null, // テンプレートなし
    };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);

    await expect(
      getMcpServerAndOAuthClient(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      ),
    ).rejects.toThrow("MCPサーバーテンプレートのURLが見つかりません");
  });

  test("組織IDが一致しない場合にエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: "different-org-id", // 異なる組織ID
      },
      mcpServerTemplate: {
        id: "template_123",
        url: "https://example.com/mcp",
        transportType: TransportType.STREAMABLE_HTTPS,
      },
    };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);

    await expect(
      getMcpServerAndOAuthClient(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      ),
    ).rejects.toThrow("このMCPサーバーへのアクセス権限がありません");
  });

  test("MCPサーバーテンプレートのURLが存在しない場合にエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: mockOrganizationId,
      },
      mcpServerTemplate: {
        id: "template_123",
        url: null, // URLなし
        transportType: TransportType.STREAMABLE_HTTPS,
      },
    };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);

    await expect(
      getMcpServerAndOAuthClient(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      ),
    ).rejects.toThrow("MCPサーバーテンプレートのURLが見つかりません");
  });

  test("OAuthクライアントが存在しない場合にエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: mockOrganizationId,
      },
      mcpServerTemplate: {
        id: "template_123",
        url: "https://example.com/mcp",
        transportType: TransportType.STREAMABLE_HTTPS,
      },
    };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);
    (
      mockTx.mcpOAuthClient.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    await expect(
      getMcpServerAndOAuthClient(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      ),
    ).rejects.toThrow("OAuth clientが見つかりません");
  });

  test("組織が存在しない場合にエラーを投げる", async () => {
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: mockOrganizationId,
      },
      mcpServerTemplate: {
        id: "template_123",
        url: "https://example.com/mcp",
        transportType: TransportType.STREAMABLE_HTTPS,
      },
    };

    const mockOAuthClient = {
      id: "oauth_client_123",
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);
    (
      mockTx.mcpOAuthClient.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockOAuthClient);
    (
      mockTx.organization.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    await expect(
      getMcpServerAndOAuthClient(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      ),
    ).rejects.toThrow("組織が見つかりません");
  });

  test("最新のOAuthクライアントが取得されることを確認", async () => {
    const mockTemplateInstance = {
      id: mockMcpServerTemplateInstanceId,
      mcpServer: {
        id: mockMcpServerId,
        name: "Test MCP Server",
        organizationId: mockOrganizationId,
      },
      mcpServerTemplate: {
        id: "template_123",
        url: "https://example.com/mcp",
        transportType: TransportType.STREAMABLE_HTTPS,
      },
    };

    const mockOAuthClient = {
      id: "oauth_client_456", // 最新のクライアント
      clientId: "latest-client",
      clientSecret: "latest-secret",
      authorizationServerUrl: "https://oauth.example.com",
    };

    const mockOrganization = { slug: "test-org" };

    (
      mockTx.mcpServerTemplateInstance.findUniqueOrThrow as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockTemplateInstance);
    (
      mockTx.mcpOAuthClient.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockOAuthClient);
    (
      mockTx.organization.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockOrganization);

    await getMcpServerAndOAuthClient(
      mockTx,
      mockMcpServerTemplateInstanceId,
      mockOrganizationId,
    );

    // findFirstが正しいパラメータで呼ばれることを確認
    expect(mockTx.mcpOAuthClient.findFirst).toHaveBeenCalledWith({
      where: {
        mcpServerTemplateId: "template_123",
        organizationId: mockOrganizationId,
      },
      select: {
        id: true,
        clientId: true,
        clientSecret: true,
        authorizationServerUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });
});

describe("exchangeAuthorizationCode", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("認可コードを正常にアクセストークンに交換する", async () => {
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClient = {
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };
    const mockCurrentUrl = new URL(
      "https://example.com/callback?code=auth_code&state=state-123",
    );
    const mockOriginalServerUrl = "https://original.example.com/mcp";

    // OAuthメタデータのモック
    const mockAuthServer = {
      issuer: "https://oauth.example.com",
      authorization_endpoint: "https://oauth.example.com/auth",
      token_endpoint: "https://oauth.example.com/token",
    };

    // OAuth4Webapi のモック
    const mockParams = new URLSearchParams("code=auth_code&state=state-123");
    const mockTokenData = {
      access_token: "access_token_xyz",
      refresh_token: "refresh_token_abc",
      expires_in: 3600,
      token_type: "Bearer",
    };

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockReturnValue(mockParams);
    mockExchangeCodeForToken.mockResolvedValue(mockTokenData);

    const result = await exchangeAuthorizationCode(
      mockCurrentUrl,
      "state-123",
      mockStatePayload,
      mockOAuthClient,
      mockOriginalServerUrl,
    );

    expect(result).toStrictEqual(mockTokenData);

    // 正しいパラメータで各関数が呼ばれることを確認
    expect(mockDiscoverOAuthMetadata).toHaveBeenCalledWith(
      mockOriginalServerUrl,
    );
    expect(mockValidateAuthResponse).toHaveBeenCalledWith(
      mockAuthServer,
      {
        client_id: "client-123",
        token_endpoint_auth_method: "client_secret_post",
        client_secret: "secret-abc",
      },
      mockCurrentUrl,
      "state-123",
    );
    expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
      mockAuthServer,
      {
        client_id: "client-123",
        token_endpoint_auth_method: "client_secret_post",
        client_secret: "secret-abc",
      },
      mockParams,
      mockStatePayload.redirectUri,
      mockStatePayload.codeVerifier,
    );
  });

  test("クライアントシークレットがない場合も正常に処理する", async () => {
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClientWithoutSecret = {
      clientId: "client-123",
      clientSecret: null, // シークレットなし（パブリッククライアント）
      authorizationServerUrl: "https://oauth.example.com",
    };
    const mockCurrentUrl = new URL(
      "https://example.com/callback?code=auth_code",
    );
    const mockOriginalServerUrl = "https://original.example.com/mcp";

    const mockAuthServer = {
      issuer: "https://oauth.example.com",
      authorization_endpoint: "https://oauth.example.com/auth",
      token_endpoint: "https://oauth.example.com/token",
    };

    const mockParams = new URLSearchParams("code=auth_code");
    const mockTokenData = {
      access_token: "access_token_xyz",
      token_type: "Bearer",
    };

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockReturnValue(mockParams);
    mockExchangeCodeForToken.mockResolvedValue(mockTokenData);

    const result = await exchangeAuthorizationCode(
      mockCurrentUrl,
      "state-123",
      mockStatePayload,
      mockOAuthClientWithoutSecret,
      mockOriginalServerUrl,
    );

    expect(result).toStrictEqual(mockTokenData);

    // client_secretが含まれていないクライアントオブジェクトが渡されることを確認
    // パブリッククライアントなのでtoken_endpoint_auth_methodは"none"
    expect(mockValidateAuthResponse).toHaveBeenCalledWith(
      mockAuthServer,
      {
        client_id: "client-123",
        token_endpoint_auth_method: "none",
        // client_secretは含まれない
      },
      mockCurrentUrl,
      "state-123",
    );
  });

  test("OAuth認可レスポンスの検証に失敗した場合のエラー", async () => {
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClient = {
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };
    const mockCurrentUrl = new URL("https://example.com/callback?error=denied");
    const mockOriginalServerUrl = "https://original.example.com/mcp";

    const mockAuthServer = {
      issuer: "https://oauth.example.com",
    };

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockImplementation(() => {
      throw new Error("Authorization denied by user");
    });

    await expect(
      exchangeAuthorizationCode(
        mockCurrentUrl,
        "state-123",
        mockStatePayload,
        mockOAuthClient,
        mockOriginalServerUrl,
      ),
    ).rejects.toThrow("Authorization denied by user");
  });

  test("OAuth認可レスポンスの検証で不明なエラーが発生した場合", async () => {
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClient = {
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };
    const mockCurrentUrl = new URL("https://example.com/callback");
    const mockOriginalServerUrl = "https://original.example.com/mcp";

    const mockAuthServer = {
      issuer: "https://oauth.example.com",
    };

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "Unknown validation error"; // Error オブジェクトでない
    });

    await expect(
      exchangeAuthorizationCode(
        mockCurrentUrl,
        "state-123",
        mockStatePayload,
        mockOAuthClient,
        mockOriginalServerUrl,
      ),
    ).rejects.toThrow("Authorization response validation failed");
  });

  test("トークン交換に失敗した場合のエラー", async () => {
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClient = {
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };
    const mockCurrentUrl = new URL(
      "https://example.com/callback?code=auth_code",
    );
    const mockOriginalServerUrl = "https://original.example.com/mcp";

    const mockAuthServer = {
      issuer: "https://oauth.example.com",
    };
    const mockParams = new URLSearchParams("code=auth_code");

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockReturnValue(mockParams);
    mockExchangeCodeForToken.mockRejectedValue(
      new Error("Invalid authorization code"),
    );

    await expect(
      exchangeAuthorizationCode(
        mockCurrentUrl,
        "state-123",
        mockStatePayload,
        mockOAuthClient,
        mockOriginalServerUrl,
      ),
    ).rejects.toThrow("Invalid authorization code");
  });

  test("トークン交換で不明なエラーが発生した場合", async () => {
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClient = {
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://oauth.example.com",
    };
    const mockCurrentUrl = new URL(
      "https://example.com/callback?code=auth_code",
    );
    const mockOriginalServerUrl = "https://original.example.com/mcp";

    const mockAuthServer = {
      issuer: "https://oauth.example.com",
    };
    const mockParams = new URLSearchParams("code=auth_code");

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockReturnValue(mockParams);
    mockExchangeCodeForToken.mockRejectedValue("Unknown token error");

    await expect(
      exchangeAuthorizationCode(
        mockCurrentUrl,
        "state-123",
        mockStatePayload,
        mockOAuthClient,
        mockOriginalServerUrl,
      ),
    ).rejects.toThrow("Token exchange failed");
  });

  test("元のサーバーURLがメタデータ取得に使用されることを確認", async () => {
    // issuerが異なる場合でも、元のMCPサーバーURLを使用することを確認
    const mockStatePayload = createMockStatePayload();
    const mockOAuthClient = {
      clientId: "client-123",
      clientSecret: "secret-abc",
      authorizationServerUrl: "https://different-oauth.example.com", // 異なるURL
    };
    const mockCurrentUrl = new URL(
      "https://example.com/callback?code=auth_code",
    );
    const mockOriginalServerUrl = "https://original-mcp.example.com/mcp"; // 元のMCPサーバーURL

    const mockAuthServer = {
      issuer: "https://original-oauth.example.com", // 元のサーバーから取得されるissuer
    };
    const mockParams = new URLSearchParams("code=auth_code");
    const mockTokenData = {
      access_token: "access_token_xyz",
      token_type: "Bearer",
    };

    mockDiscoverOAuthMetadata.mockResolvedValue(mockAuthServer);
    mockValidateAuthResponse.mockReturnValue(mockParams);
    mockExchangeCodeForToken.mockResolvedValue(mockTokenData);

    await exchangeAuthorizationCode(
      mockCurrentUrl,
      "state-123",
      mockStatePayload,
      mockOAuthClient,
      mockOriginalServerUrl,
    );

    // 元のMCPサーバーURLがメタデータ発見に使用されることを確認
    expect(mockDiscoverOAuthMetadata).toHaveBeenCalledWith(
      mockOriginalServerUrl,
    );
  });
});
