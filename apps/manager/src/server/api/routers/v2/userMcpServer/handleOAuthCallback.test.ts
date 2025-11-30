import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import {
  handleOAuthCallback,
  type HandleOAuthCallbackInput,
} from "./handleOAuthCallback";

// モックモジュール
vi.mock("./helpers/oauth-verification", () => ({
  verifyOAuthState: vi.fn(),
  getMcpServerAndOAuthClient: vi.fn(),
  exchangeAuthorizationCode: vi.fn(),
}));

vi.mock("./helpers/mcp-server-setup", () => ({
  setupMcpServerTools: vi.fn(),
}));

// モックされた関数をインポート
import {
  verifyOAuthState,
  getMcpServerAndOAuthClient,
  exchangeAuthorizationCode,
} from "./helpers/oauth-verification";
import { setupMcpServerTools } from "./helpers/mcp-server-setup";

// モックデータ
const mockStatePayload = {
  state: "test-state",
  codeVerifier: "test-verifier",
  codeChallenge: "test-challenge",
  nonce: "test-nonce",
  mcpServerId: "mcp-server-123",
  userId: "user-123",
  organizationId: "org-123",
  redirectUri: "https://local.tumiki.cloud:3000/callback",
  requestedScopes: ["read", "write"],
  expiresAt: Date.now() + 600000,
};

const mockMcpServer = {
  id: "mcp-server-123",
  name: "Test MCP Server",
  templateUrl: "https://mcp-server.example.com",
  transportType: "SSE" as const,
};

const mockOAuthClient = {
  id: "oauth-client-123",
  clientId: "client-123",
  clientSecret: "client-secret",
  authorizationServerUrl: "https://auth.example.com",
};

const mockOrganization = {
  slug: "test-org",
};

const mockTokenData = {
  access_token: "access-token-123",
  refresh_token: "refresh-token-123",
  expires_in: 3600,
  token_type: "Bearer" as const,
};

const mockInput: HandleOAuthCallbackInput = {
  state: "test-state-token",
  userId: "user-123",
  currentUrl: new URL(
    "https://local.tumiki.cloud:3000/callback?code=auth-code",
  ),
};

// モックトランザクションクライアント
const createMockTx = (): PrismaTransactionClient => {
  const mockCreate = vi.fn();

  return {
    mcpOAuthToken: {
      create: mockCreate,
    },
  } as unknown as PrismaTransactionClient;
};

describe("handleOAuthCallback", () => {
  let mockTx: PrismaTransactionClient;

  beforeEach(() => {
    mockTx = createMockTx();
    vi.clearAllMocks();

    // デフォルトのモック動作を設定
    vi.mocked(verifyOAuthState).mockResolvedValue(mockStatePayload);
    vi.mocked(getMcpServerAndOAuthClient).mockResolvedValue({
      mcpServer: mockMcpServer,
      oauthClient: mockOAuthClient,
      organization: mockOrganization,
    });
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue(mockTokenData);
    vi.mocked(setupMcpServerTools).mockResolvedValue(1); // ツール数を返す
  });

  test("正常なOAuth認証フローが完了する", async () => {
    const result = await handleOAuthCallback(mockTx, mockInput);

    expect(result).toStrictEqual({
      organizationSlug: "test-org",
      success: true,
    });

    // 各ヘルパー関数が正しく呼び出されたことを確認
    expect(verifyOAuthState).toHaveBeenCalledWith(
      mockInput.state,
      mockInput.userId,
    );
    expect(getMcpServerAndOAuthClient).toHaveBeenCalledWith(
      mockTx,
      mockStatePayload.mcpServerId,
      mockStatePayload.organizationId,
    );
    expect(exchangeAuthorizationCode).toHaveBeenCalledWith(
      mockInput.currentUrl,
      mockInput.state,
      mockStatePayload,
      mockOAuthClient,
      mockMcpServer.templateUrl,
    );

    // OAuthトークンが保存されたことを確認
    expect(mockTx.mcpOAuthToken.create).toHaveBeenCalledWith({
      data: {
        userId: mockInput.userId,
        organizationId: mockStatePayload.organizationId,
        oauthClientId: mockOAuthClient.id,
        accessToken: mockTokenData.access_token,
        refreshToken: mockTokenData.refresh_token,
        expiresAt: expect.any(Date),
        tokenPurpose: "BACKEND_MCP",
      },
    });

    // MCPサーバーツールがセットアップされたことを確認
    expect(setupMcpServerTools).toHaveBeenCalledWith(mockTx, {
      mcpServerId: mockMcpServer.id,
      mcpServerName: mockMcpServer.name,
      mcpServerTemplateUrl: mockMcpServer.templateUrl,
      accessToken: mockTokenData.access_token,
      transportType: mockMcpServer.transportType,
    });
  });

  test("改ざんされたstate tokenは拒否される", async () => {
    vi.mocked(verifyOAuthState).mockRejectedValue(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid state token",
      }),
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toThrow(
      TRPCError,
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid state token",
    });

    // トークン保存は実行されないことを確認
    expect(mockTx.mcpOAuthToken.create).not.toHaveBeenCalled();
  });

  test("ユーザーIDの不一致は拒否される", async () => {
    vi.mocked(verifyOAuthState).mockRejectedValue(
      new TRPCError({
        code: "FORBIDDEN",
        message: "User mismatch",
      }),
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toThrow(
      TRPCError,
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "User mismatch",
    });
  });

  test("存在しないMCPサーバーはエラーになる", async () => {
    vi.mocked(getMcpServerAndOAuthClient).mockRejectedValue(
      new TRPCError({
        code: "NOT_FOUND",
        message: "MCPサーバーまたはテンプレートが見つかりません",
      }),
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toThrow(
      TRPCError,
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "MCPサーバーまたはテンプレートが見つかりません",
    });
  });

  test("トークン交換に失敗した場合、エラーになる", async () => {
    vi.mocked(exchangeAuthorizationCode).mockRejectedValue(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Token exchange failed",
      }),
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toThrow(
      TRPCError,
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Token exchange failed",
    });

    // トークン保存は実行されないことを確認
    expect(mockTx.mcpOAuthToken.create).not.toHaveBeenCalled();
  });

  test("refresh_tokenがない場合、nullで保存される", async () => {
    const tokenDataWithoutRefresh = {
      access_token: mockTokenData.access_token,
      token_type: mockTokenData.token_type,
      expires_in: mockTokenData.expires_in,
      refresh_token: undefined as string | undefined,
    };
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue(
      tokenDataWithoutRefresh,
    );

    await handleOAuthCallback(mockTx, mockInput);

    expect(mockTx.mcpOAuthToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        refreshToken: null,
      }),
    });
  });

  test("expires_inがない場合、expiresAtはnullになる", async () => {
    const tokenDataWithoutExpiry = {
      access_token: mockTokenData.access_token,
      token_type: mockTokenData.token_type,
      expires_in: undefined as number | undefined,
      refresh_token: mockTokenData.refresh_token,
    };
    vi.mocked(exchangeAuthorizationCode).mockResolvedValue(
      tokenDataWithoutExpiry,
    );

    await handleOAuthCallback(mockTx, mockInput);

    expect(mockTx.mcpOAuthToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: null,
      }),
    });
  });

  test("一般的なエラーはINTERNAL_SERVER_ERRORに変換される", async () => {
    vi.mocked(verifyOAuthState).mockRejectedValue(
      new Error("Unexpected error"),
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toThrow(
      TRPCError,
    );

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected error",
    });
  });

  test("MCPサーバーツールのセットアップに失敗してもトークンは保存される", async () => {
    vi.mocked(setupMcpServerTools).mockRejectedValue(new Error("Setup failed"));

    await expect(handleOAuthCallback(mockTx, mockInput)).rejects.toThrow(
      TRPCError,
    );

    // トークン保存は実行されることを確認
    expect(mockTx.mcpOAuthToken.create).toHaveBeenCalled();
  });
});
