/**
 * token-refresh.ts のテスト
 *
 * discoverTokenEndpoint は refreshBackendToken の内部関数のため、
 * fetch をモックして refreshBackendToken 経由でテストする
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { db } from "@tumiki/db/server";

import { TokenRefreshError } from "../types.js";

// DBモック
vi.mock("@tumiki/db/server", () => ({
  db: {
    mcpOAuthToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockFindUnique = vi.mocked(db.mcpOAuthToken.findUnique);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockUpdate = vi.mocked(db.mcpOAuthToken.update);

// 共通のトークンとクライアント情報
const mockOauthClient = {
  id: "client-id-1",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  authorizationServerUrl: "https://auth.example.com",
};

const mockToken = {
  id: "token-id-1",
  accessToken: "old-access-token",
  refreshToken: "test-refresh-token",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  oauthClient: mockOauthClient,
};

const mockUpdatedToken = {
  id: "token-id-1",
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  oauthClient: mockOauthClient,
};

const mockTokenRefreshResponse = {
  access_token: "new-access-token",
  refresh_token: "new-refresh-token",
  token_type: "Bearer",
  expires_in: 3600,
};

const expectedRefreshedToken = {
  id: "token-id-1",
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
  expiresAt: mockUpdatedToken.expiresAt,
  oauthClientId: "client-id-1",
};

describe("refreshBackendToken", () => {
  beforeEach(() => {
    mockFindUnique.mockResolvedValue(mockToken as never);
    mockUpdate.mockResolvedValue(mockUpdatedToken as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("トークンが存在しない場合はTokenRefreshErrorを投げる", async () => {
    mockFindUnique.mockResolvedValue(null);

    const { refreshBackendToken } = await import("../token-refresh.js");

    await expect(refreshBackendToken("not-found-id")).rejects.toBeInstanceOf(
      TokenRefreshError,
    );
  });

  test("リフレッシュトークンが存在しない場合はTokenRefreshErrorを投げる", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockToken,
      refreshToken: null,
    } as never);

    const { refreshBackendToken } = await import("../token-refresh.js");

    await expect(refreshBackendToken("token-id-1")).rejects.toBeInstanceOf(
      TokenRefreshError,
    );
  });

  describe("discoverTokenEndpoint フォールバックロジック", () => {
    test("RFC 8414エンドポイントが成功した場合はそのレスポンスを返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/token",
              token_endpoint_auth_methods_supported: ["client_secret_basic"],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenRefreshResponse,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result).toStrictEqual(expectedRefreshedToken);
      expect(vi.mocked(fetch).mock.calls[0]?.[0]).toStrictEqual(
        "https://auth.example.com/.well-known/oauth-authorization-server",
      );
    });

    test("RFC 8414が失敗した場合はOpenID Connectにフォールバックする", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/oauth2/token",
              token_endpoint_auth_methods_supported: ["client_secret_post"],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenRefreshResponse,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result).toStrictEqual(expectedRefreshedToken);
      expect(vi.mocked(fetch).mock.calls[1]?.[0]).toStrictEqual(
        "https://auth.example.com/.well-known/openid-configuration",
      );
    });

    test("両エンドポイントが失敗した場合はTokenRefreshErrorを投げる", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");

      await expect(refreshBackendToken("token-id-1")).rejects.toBeInstanceOf(
        TokenRefreshError,
      );
    });

    test("レスポンスのtoken_endpointが存在しない場合は次のエンドポイントを試みる", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              issuer: "https://auth.example.com",
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/openid/token",
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenRefreshResponse,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result).toStrictEqual(expectedRefreshedToken);
      expect(vi.mocked(fetch).mock.calls[1]?.[0]).toStrictEqual(
        "https://auth.example.com/.well-known/openid-configuration",
      );
    });

    test("fetchが例外をスローした場合は次のエンドポイントにフォールバックする", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockRejectedValueOnce(new Error("Network error"))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/openid/token",
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenRefreshResponse,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result).toStrictEqual(expectedRefreshedToken);
    });
  });

  describe("requestTokenRefresh エラーハンドリング", () => {
    test("トークンリフレッシュリクエストが失敗した場合はTokenRefreshErrorを投げる", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/token",
            }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => "Unauthorized",
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");

      await expect(refreshBackendToken("token-id-1")).rejects.toBeInstanceOf(
        TokenRefreshError,
      );
    });

    test("client_secret_post認証方式でトークンリフレッシュが成功する", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/token",
              token_endpoint_auth_methods_supported: ["client_secret_post"],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenRefreshResponse,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result).toStrictEqual(expectedRefreshedToken);
      const body = vi.mocked(fetch).mock.calls[1]?.[1]?.body as URLSearchParams;
      expect(body.get("client_id")).toStrictEqual("test-client-id");
    });

    test("レスポンスのrefresh_tokenがない場合は元のrefresh_tokenを継続して使用する", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/token",
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              access_token: "new-access-token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
          }),
      );

      mockUpdate.mockResolvedValue({
        ...mockUpdatedToken,
        refreshToken: "test-refresh-token",
      } as never);

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result.refreshToken).toStrictEqual("test-refresh-token");
    });

    test("Errorオブジェクトでない例外がスローされた場合はUnknownエラーメッセージを含むTokenRefreshErrorを投げる", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/token",
            }),
          })
          .mockRejectedValueOnce("string error"), // Errorオブジェクトではなく文字列をスロー
      );

      const { refreshBackendToken } = await import("../token-refresh.js");

      const thrownError = await refreshBackendToken("token-id-1").catch(
        (e: unknown) => e,
      );
      expect(thrownError).toBeInstanceOf(TokenRefreshError);
      expect((thrownError as TokenRefreshError).message).toContain(
        "Unknown error",
      );
    });

    test("clientSecretがnullの場合はBasic認証でコロンのみの認証情報を使用する", async () => {
      mockFindUnique.mockResolvedValue({
        ...mockToken,
        oauthClient: {
          ...mockOauthClient,
          clientSecret: null,
        },
      } as never);

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              token_endpoint: "https://auth.example.com/token",
              token_endpoint_auth_methods_supported: ["client_secret_basic"],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTokenRefreshResponse,
          }),
      );

      const { refreshBackendToken } = await import("../token-refresh.js");
      const result = await refreshBackendToken("token-id-1");

      expect(result.accessToken).toStrictEqual("new-access-token");
      const headers = vi.mocked(fetch).mock.calls[1]?.[1]?.headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toMatch(/^Basic /);
    });
  });
});
