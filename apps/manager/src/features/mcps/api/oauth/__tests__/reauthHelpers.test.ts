import { describe, test, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaTransactionClient } from "@tumiki/db";
import {
  fetchOAuthTokenWithClient,
  fetchAndValidateOAuthMetadata,
  generateReauthenticationUrl,
  validateTemplateUrl,
} from "../reauthHelpers";
import * as dcr from "@/lib/oauth/dcr";
import * as generateAuthUrlHelper from "../../helpers/generateAuthorizationUrl";

// モック設定
vi.mock("@/lib/oauth/dcr");
vi.mock("../../helpers/generateAuthorizationUrl");

const mockDiscoverOAuthMetadata = vi.mocked(dcr.discoverOAuthMetadata);
const mockGenerateAuthorizationUrl = vi.mocked(
  generateAuthUrlHelper.generateAuthorizationUrl,
);

describe("reauthHelpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchOAuthTokenWithClient", () => {
    test("OAuthトークンが存在する場合、トークン情報を返す", async () => {
      const mockToken = {
        id: "token-123",
        oauthClient: {
          clientId: "client-123",
          clientSecret: "secret-abc",
        },
      };

      const mockTx = {
        mcpOAuthToken: {
          findUnique: vi.fn().mockResolvedValue(mockToken),
        },
      } as unknown as PrismaTransactionClient;

      const result = await fetchOAuthTokenWithClient(
        mockTx,
        "user-123",
        "instance-456",
      );

      expect(result).toStrictEqual(mockToken);
      expect(mockTx.mcpOAuthToken.findUnique).toHaveBeenCalledWith({
        where: {
          userId_mcpServerTemplateInstanceId: {
            userId: "user-123",
            mcpServerTemplateInstanceId: "instance-456",
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

    test("OAuthトークンが存在しない場合、nullを返す", async () => {
      const mockTx = {
        mcpOAuthToken: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaTransactionClient;

      const result = await fetchOAuthTokenWithClient(
        mockTx,
        "user-123",
        "instance-456",
      );

      expect(result).toBeNull();
    });
  });

  describe("fetchAndValidateOAuthMetadata", () => {
    test("有効なメタデータの場合、検証済みメタデータを返す", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        scopes_supported: ["read", "write"],
      });

      const result = await fetchAndValidateOAuthMetadata(
        "https://example.com/mcp",
      );

      expect(result).toStrictEqual({
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        scopes_supported: ["read", "write"],
      });
    });

    test("authorization_endpointがない場合、INTERNAL_SERVER_ERRORをスローする", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: undefined,
        token_endpoint: "https://auth.example.com/token",
      });

      await expect(
        fetchAndValidateOAuthMetadata("https://example.com/mcp"),
      ).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "OAuthメタデータの取得に失敗しました。Authorization EndpointまたはToken Endpointが見つかりません。",
        }),
      );
    });

    test("token_endpointがない場合、INTERNAL_SERVER_ERRORをスローする", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: undefined,
      });

      await expect(
        fetchAndValidateOAuthMetadata("https://example.com/mcp"),
      ).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "OAuthメタデータの取得に失敗しました。Authorization EndpointまたはToken Endpointが見つかりません。",
        }),
      );
    });
  });

  describe("generateReauthenticationUrl", () => {
    test("正常なパラメータでAuthorization URLを生成する", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        scopes_supported: ["read", "write"],
      });
      mockGenerateAuthorizationUrl.mockResolvedValue(
        "https://auth.example.com/authorize?client_id=client-123",
      );

      const result = await generateReauthenticationUrl({
        templateUrl: "https://example.com/mcp",
        oauthClient: {
          clientId: "client-123",
          clientSecret: "secret-abc",
        },
        mcpServerId: "server-123",
        mcpServerTemplateInstanceId: "instance-456",
        userId: "user-789",
        organizationId: "org-abc",
        redirectTo: "/chat/123",
      });

      expect(result).toBe(
        "https://auth.example.com/authorize?client_id=client-123",
      );
      expect(mockGenerateAuthorizationUrl).toHaveBeenCalledWith({
        clientId: "client-123",
        clientSecret: "secret-abc",
        authorizationEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        scopes: ["read", "write"],
        mcpServerId: "server-123",
        mcpServerTemplateInstanceId: "instance-456",
        userId: "user-789",
        organizationId: "org-abc",
        redirectTo: "/chat/123",
      });
    });

    test("clientSecretがnullの場合、空文字列を使用する", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        issuer: "https://auth.example.com",
        authorization_endpoint: "https://auth.example.com/authorize",
        token_endpoint: "https://auth.example.com/token",
        scopes_supported: [],
      });
      mockGenerateAuthorizationUrl.mockResolvedValue(
        "https://example.com/auth",
      );

      await generateReauthenticationUrl({
        templateUrl: "https://example.com/mcp",
        oauthClient: {
          clientId: "client-123",
          clientSecret: null,
        },
        mcpServerId: "server-123",
        mcpServerTemplateInstanceId: "instance-456",
        userId: "user-789",
        organizationId: "org-abc",
      });

      expect(mockGenerateAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          clientSecret: "",
        }),
      );
    });
  });

  describe("validateTemplateUrl", () => {
    test("urlが存在する場合、urlを返す", () => {
      const result = validateTemplateUrl({ url: "https://example.com/mcp" });
      expect(result).toBe("https://example.com/mcp");
    });

    test("urlがnullの場合、NOT_FOUNDエラーをスローする", () => {
      expect(() => validateTemplateUrl({ url: null })).toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "MCPサーバーテンプレートのURLが見つかりません",
        }),
      );
    });

    test("templateがnullの場合、NOT_FOUNDエラーをスローする", () => {
      expect(() => validateTemplateUrl(null)).toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "MCPサーバーテンプレートのURLが見つかりません",
        }),
      );
    });

    test("templateがundefinedの場合、NOT_FOUNDエラーをスローする", () => {
      expect(() => validateTemplateUrl(undefined)).toThrow(
        new TRPCError({
          code: "NOT_FOUND",
          message: "MCPサーバーテンプレートのURLが見つかりません",
        }),
      );
    });
  });
});
