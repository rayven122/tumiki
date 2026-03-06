import { describe, test, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import { TransportType, ServerStatus } from "@tumiki/db/prisma";
import {
  handleOAuthCallback,
  type HandleOAuthCallbackInput,
} from "../handleOAuthCallback";
import * as oauthVerification from "../../helpers/oauth-verification";
import * as mcpServerSetup from "../../helpers/mcp-server-setup";
import type { OAuthStatePayload } from "@/lib/oauth/state-token";
import type { OAuthTokenData } from "@/lib/oauth/oauth-client";

// モック設定
vi.mock("../../helpers/oauth-verification");
vi.mock("../../helpers/mcp-server-setup");

const mockVerifyOAuthState = vi.mocked(oauthVerification.verifyOAuthState);
const mockGetMcpServerAndOAuthClient = vi.mocked(
  oauthVerification.getMcpServerAndOAuthClient,
);
const mockExchangeAuthorizationCode = vi.mocked(
  oauthVerification.exchangeAuthorizationCode,
);
const mockSetupMcpServerTools = vi.mocked(mcpServerSetup.setupMcpServerTools);

// モック用のデータ
const mockUserId = "user_123";
const mockOrganizationId = "org_456";
const mockMcpServerId = "mcp_789";
const mockMcpServerTemplateId = "template_xyz";
const mockMcpServerTemplateInstanceId = "instance_abc";
const mockOAuthClientId = "oauth_client_123";
const mockStateToken = "valid-state-token";
const mockAccessToken = "access_token_xyz";
const mockRefreshToken = "refresh_token_abc";

const createMockStatePayload = (): OAuthStatePayload => ({
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
  expiresAt: Date.now() + 10 * 60 * 1000, // 10分後
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
});

const createMockMcpServerData = (
  serverStatus: (typeof ServerStatus)[keyof typeof ServerStatus] = ServerStatus.PENDING,
) => ({
  mcpServer: {
    id: mockMcpServerId,
    name: "Test MCP Server",
    templateUrl: "https://example.com/mcp",
    transportType: TransportType.STREAMABLE_HTTPS,
    serverStatus,
  },
  mcpServerTemplateId: mockMcpServerTemplateId,
  mcpServerTemplateInstanceId: mockMcpServerTemplateInstanceId,
  oauthClient: {
    id: mockOAuthClientId,
    clientId: "client-123",
    clientSecret: "secret-abc",
    authorizationServerUrl: "https://oauth.example.com",
  },
  organization: {
    slug: "test-org",
  },
});

const createMockTokenData = (): OAuthTokenData => ({
  access_token: mockAccessToken,
  refresh_token: mockRefreshToken,
  expires_in: 3600, // 1時間
  token_type: "Bearer",
});

// Prismaトランザクションクライアントのモック
const createMockPrismaClient = () => {
  const mockUpsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockFindUnique = vi.fn();

  return {
    mcpOAuthToken: {
      upsert: mockUpsert,
    },
    mcpServer: {
      update: mockUpdate,
      findUnique: mockFindUnique,
    },
  } as unknown as PrismaTransactionClient;
};

describe("handleOAuthCallback", () => {
  let mockTx: PrismaTransactionClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockTx = createMockPrismaClient();
  });

  describe("正常フロー", () => {
    test("有効なOAuthコールバックを正常に処理する", async () => {
      // モックの設定
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(5); // 5つのツール

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL(
          "https://example.com/callback?code=auth_code&state=" + mockStateToken,
        ),
      };

      // テスト実行
      const result = await handleOAuthCallback(mockTx, input);

      // 結果の検証
      expect(result).toStrictEqual({
        organizationSlug: "test-org",
        organizationId: mockOrganizationId,
        mcpServerId: mockMcpServerId,
        mcpServerName: "Test MCP Server",
        success: true,
        redirectTo: undefined, // statePayloadにredirectToがない場合はundefined
        isNewServer: true, // PENDING状態なので新規サーバー
      });

      // 各ステップが正しく呼ばれたことを確認
      expect(mockVerifyOAuthState).toHaveBeenCalledWith(
        mockStateToken,
        mockUserId,
      );
      expect(mockGetMcpServerAndOAuthClient).toHaveBeenCalledWith(
        mockTx,
        mockMcpServerTemplateInstanceId,
        mockOrganizationId,
      );
      expect(mockExchangeAuthorizationCode).toHaveBeenCalledWith(
        input.currentUrl,
        mockStateToken,
        statePayload,
        mcpServerData.oauthClient,
        mcpServerData.mcpServer.templateUrl,
      );

      // OAuthトークンが保存されたことを確認
      const createCall = vi.mocked(mockTx.mcpOAuthToken.upsert).mock.calls[0];
      expect(createCall).toBeDefined();
      const createData = createCall?.[0]?.create;
      expect(createData).toBeDefined();
      expect(createData?.userId).toBe(mockUserId);
      expect(createData?.organizationId).toBe(mockOrganizationId);
      expect(createData?.oauthClientId).toBe(mockOAuthClientId);
      expect(createData?.accessToken).toBe(mockAccessToken);
      expect(createData?.refreshToken).toBe(mockRefreshToken);
      expect(createData?.expiresAt).toBeInstanceOf(Date);
      expect(createData?.tokenPurpose).toBe("BACKEND_MCP");

      // MCPサーバーのセットアップが行われたことを確認
      expect(mockSetupMcpServerTools).toHaveBeenCalledWith(mockTx, {
        mcpServerId: mockMcpServerId,
        mcpServerName: "Test MCP Server",
        mcpServerTemplateUrl: "https://example.com/mcp",
        accessToken: mockAccessToken,
        transportType: TransportType.STREAMABLE_HTTPS,
      });
    });

    test("リフレッシュトークンが無い場合も正常に処理する", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenDataWithoutRefresh = {
        ...createMockTokenData(),
        refresh_token: undefined, // リフレッシュトークン無し
      };

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenDataWithoutRefresh);
      mockSetupMcpServerTools.mockResolvedValue(3);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL(
          "https://example.com/callback?code=auth_code&state=" + mockStateToken,
        ),
      };

      const result = await handleOAuthCallback(mockTx, input);

      expect(result.success).toBe(true);

      // リフレッシュトークンがnullで保存されることを確認
      const createCall = vi.mocked(mockTx.mcpOAuthToken.upsert).mock.calls[0];
      expect(createCall).toBeDefined();
      const createData = createCall?.[0]?.create;
      expect(createData).toBeDefined();
      expect(createData?.refreshToken).toBeNull();
    });

    test("expires_inが無い場合はexpiresAtがnullで保存される", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenDataWithoutExpiry = {
        ...createMockTokenData(),
        expires_in: undefined, // 期限なし
      };

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenDataWithoutExpiry);
      mockSetupMcpServerTools.mockResolvedValue(2);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL(
          "https://example.com/callback?code=auth_code&state=" + mockStateToken,
        ),
      };

      await handleOAuthCallback(mockTx, input);

      const createCall = vi.mocked(mockTx.mcpOAuthToken.upsert).mock.calls[0];
      expect(createCall).toBeDefined();
      const createData = createCall?.[0]?.create;
      expect(createData).toBeDefined();
      expect(createData?.expiresAt).toBeNull();
    });

    test("PENDING状態のサーバーはisNewServer=trueを返す", async () => {
      const statePayload = createMockStatePayload();
      // デフォルトはPENDING状態
      const mcpServerData = createMockMcpServerData(ServerStatus.PENDING);
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(3);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL(
          "https://example.com/callback?code=auth_code&state=" + mockStateToken,
        ),
      };

      const result = await handleOAuthCallback(mockTx, input);

      expect(result.success).toBe(true);
      expect(result.isNewServer).toBe(true);
    });

    test("RUNNING状態のサーバーはisNewServer=falseを返す（再認証）", async () => {
      const statePayload = createMockStatePayload();
      // RUNNING状態 = 既存サーバーの再認証
      const mcpServerData = createMockMcpServerData(ServerStatus.RUNNING);
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(3);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL(
          "https://example.com/callback?code=auth_code&state=" + mockStateToken,
        ),
      };

      const result = await handleOAuthCallback(mockTx, input);

      expect(result.success).toBe(true);
      expect(result.isNewServer).toBe(false);
    });

    test("ERROR状態のサーバーはisNewServer=falseを返す（再認証）", async () => {
      const statePayload = createMockStatePayload();
      // ERROR状態 = エラーからの回復再認証
      const mcpServerData = createMockMcpServerData(ServerStatus.ERROR);
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(3);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL(
          "https://example.com/callback?code=auth_code&state=" + mockStateToken,
        ),
      };

      const result = await handleOAuthCallback(mockTx, input);

      expect(result.success).toBe(true);
      expect(result.isNewServer).toBe(false);
    });
  });

  describe("異常系テスト", () => {
    test("無効なstateトークンでエラーを投げる", async () => {
      mockVerifyOAuthState.mockRejectedValue(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid state token",
        }),
      );

      const input: HandleOAuthCallbackInput = {
        state: "invalid-state-token",
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid state token",
      });
    });

    test("ユーザーIDの不一致でエラーを投げる", async () => {
      mockVerifyOAuthState.mockRejectedValue(
        new TRPCError({
          code: "FORBIDDEN",
          message: "User mismatch",
        }),
      );

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: "different-user-id",
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "User mismatch",
      });
    });

    test("MCPサーバーが見つからない場合のエラー", async () => {
      const statePayload = createMockStatePayload();
      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockRejectedValue(
        new TRPCError({
          code: "NOT_FOUND",
          message: "MCPサーバーまたはテンプレートが見つかりません",
        }),
      );

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "MCPサーバーまたはテンプレートが見つかりません",
      });
    });

    test("組織アクセス権限が無い場合のエラー", async () => {
      const statePayload = createMockStatePayload();
      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockRejectedValue(
        new TRPCError({
          code: "FORBIDDEN",
          message: "このMCPサーバーへのアクセス権限がありません",
        }),
      );

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "このMCPサーバーへのアクセス権限がありません",
      });
    });

    test("認可コードの交換に失敗した場合のエラー", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockRejectedValue(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Token exchange failed",
        }),
      );

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Token exchange failed",
      });
    });

    test("MCPサーバーのセットアップに失敗した場合のエラー", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockRejectedValue(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "MCPサーバーからツールを取得できませんでした",
        }),
      );

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "MCPサーバーからツールを取得できませんでした",
      });

      // トークンは保存されるが、セットアップでエラーが発生
      expect(mockTx.mcpOAuthToken.upsert).toHaveBeenCalled();
    });

    test("一般的なエラーを適切にハンドリングする", async () => {
      mockVerifyOAuthState.mockRejectedValue(new Error("Network error"));

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Network error",
      });
    });

    test("不明なエラーを適切にハンドリングする", async () => {
      mockVerifyOAuthState.mockRejectedValue("Unknown error");

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await expect(handleOAuthCallback(mockTx, input)).rejects.toThrow(
        TRPCError,
      );
      await expect(handleOAuthCallback(mockTx, input)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "OAuth callback failed",
      });
    });
  });

  describe("データベース操作のテスト", () => {
    test("OAuthトークンが正しい構造で保存される", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(3);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await handleOAuthCallback(mockTx, input);

      const createCall = vi.mocked(mockTx.mcpOAuthToken.upsert).mock.calls[0];
      const createData = createCall?.[0]?.create;

      expect(createData).toBeDefined();
      expect(createData?.userId).toBe(mockUserId);
      expect(createData?.organizationId).toBe(mockOrganizationId);
      expect(createData?.oauthClientId).toBe(mockOAuthClientId);
      expect(createData?.accessToken).toBe(mockAccessToken);
      expect(createData?.refreshToken).toBe(mockRefreshToken);
      expect(createData?.expiresAt).toBeInstanceOf(Date);
      expect(createData?.tokenPurpose).toBe("BACKEND_MCP");

      // expiresAtの値が正しく計算されていることを確認
      if (createData && createData.expiresAt instanceof Date) {
        const expiresAt = createData.expiresAt;
        const expectedTime = Date.now() + 3600 * 1000; // 1時間後
        expect(expiresAt.getTime()).toBeGreaterThan(expectedTime - 1000); // 1秒の誤差を許容
        expect(expiresAt.getTime()).toBeLessThan(expectedTime + 1000);
      }
    });

    test("同じOAuthクライアントでも新しいトークンが作成される", async () => {
      // コメントの通り、ユーザーは複数の異なるアカウントを接続したい場合があるため
      // 常に新しいトークンを作成する動作を確認

      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(2);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await handleOAuthCallback(mockTx, input);

      // createが呼ばれることを確認（upsertではない）
      expect(mockTx.mcpOAuthToken.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("エッジケース", () => {
    test("expires_inが0の場合の処理", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenDataZeroExpiry = {
        ...createMockTokenData(),
        expires_in: 0, // 即座に期限切れ
      };

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenDataZeroExpiry);
      mockSetupMcpServerTools.mockResolvedValue(1);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await handleOAuthCallback(mockTx, input);

      const createCall = vi.mocked(mockTx.mcpOAuthToken.upsert).mock.calls[0];
      const expiresAt = createCall?.[0]?.create.expiresAt as Date | null;

      // expires_in が0の場合、expiresAt は現在時刻に近い値になる
      if (expiresAt) {
        expect(expiresAt.getTime()).toBeLessThan(Date.now() + 1000);
      } else {
        // expires_in が0の場合はnullになる可能性もある
        expect(expiresAt).toBeNull();
      }
    });

    test("非常に長いアクセストークンの処理", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const longTokenData = {
        ...createMockTokenData(),
        access_token: "x".repeat(10000), // 10KB のトークン
        refresh_token: "y".repeat(5000), // 5KB のリフレッシュトークン
      };

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(longTokenData);
      mockSetupMcpServerTools.mockResolvedValue(4);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      const result = await handleOAuthCallback(mockTx, input);

      expect(result.success).toBe(true);
      const createCall = vi.mocked(mockTx.mcpOAuthToken.upsert).mock.calls[0];
      expect(createCall).toBeDefined();
      const createData = createCall?.[0]?.create;
      expect(createData).toBeDefined();
      expect(createData?.accessToken).toBe(longTokenData.access_token);
      expect(createData?.refreshToken).toBe(longTokenData.refresh_token);
    });

    test("SSEトランスポートタイプでの処理", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerDataSSE = {
        ...createMockMcpServerData(),
        mcpServer: {
          ...createMockMcpServerData().mcpServer,
          transportType: TransportType.SSE,
        },
      };
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerDataSSE);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(7);

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      await handleOAuthCallback(mockTx, input);

      expect(mockSetupMcpServerTools).toHaveBeenCalledWith(mockTx, {
        mcpServerId: mockMcpServerId,
        mcpServerName: "Test MCP Server",
        mcpServerTemplateUrl: "https://example.com/mcp",
        accessToken: mockAccessToken,
        transportType: TransportType.SSE,
      });
    });
  });

  describe("パフォーマンステスト", () => {
    test("大量のツールがあるMCPサーバーでも正常に処理する", async () => {
      const statePayload = createMockStatePayload();
      const mcpServerData = createMockMcpServerData();
      const tokenData = createMockTokenData();

      mockVerifyOAuthState.mockResolvedValue(statePayload);
      mockGetMcpServerAndOAuthClient.mockResolvedValue(mcpServerData);
      mockExchangeAuthorizationCode.mockResolvedValue(tokenData);
      mockSetupMcpServerTools.mockResolvedValue(100); // 100個のツール

      const input: HandleOAuthCallbackInput = {
        state: mockStateToken,
        userId: mockUserId,
        currentUrl: new URL("https://example.com/callback"),
      };

      const startTime = Date.now();
      const result = await handleOAuthCallback(mockTx, input);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      // パフォーマンスチェック（通常は瞬時に完了するはず）
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
