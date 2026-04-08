import { describe, test, expect, vi, beforeEach } from "vitest";

// oauth4webapiをモック
vi.mock("oauth4webapi", () => ({
  None: vi.fn(() => ({ type: "none" })),
  ClientSecretBasic: vi.fn((secret: string) => ({
    type: "basic",
    secret,
  })),
  ClientSecretPost: vi.fn((secret: string) => ({ type: "post", secret })),
  validateAuthResponse: vi.fn(() => new URLSearchParams({ code: "c" })),
  authorizationCodeGrantRequest: vi.fn(),
  processAuthorizationCodeResponse: vi.fn(),
  refreshTokenGrantRequest: vi.fn(),
  processRefreshTokenResponse: vi.fn(),
  customFetch: Symbol("customFetch"),
}));

import * as oauth from "oauth4webapi";
import { exchangeCodeForToken, refreshAccessToken } from "../oauth.token";

describe("oauth.token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const authServer: oauth.AuthorizationServer = {
    issuer: "https://www.figma.com",
    authorization_endpoint: "https://www.figma.com/oauth",
    token_endpoint: "https://www.figma.com/api/oauth/token",
  };

  describe("exchangeCodeForToken", () => {
    test("認可コードをアクセストークンに交換する", async () => {
      const client: oauth.Client = {
        client_id: "test-id",
        client_secret: "test-secret",
        token_endpoint_auth_method: "client_secret_post",
      };

      vi.mocked(oauth.authorizationCodeGrantRequest).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "access123",
            token_type: "bearer" as Lowercase<string>,
            expires_in: 3600,
            refresh_token: "refresh456",
            scope: "files:read",
          }),
          { status: 200 },
        ),
      );

      vi.mocked(oauth.processAuthorizationCodeResponse).mockResolvedValueOnce({
        access_token: "access123",
        token_type: "bearer" as Lowercase<string>,
        expires_in: 3600,
        refresh_token: "refresh456",
        scope: "files:read",
      });

      const callbackUrl = new URL(
        "tumiki://oauth/callback?code=auth-code&state=s",
      );
      const result = await exchangeCodeForToken(
        authServer,
        client,
        callbackUrl,
        "tumiki://oauth/callback",
        "code-verifier",
        "s",
      );

      expect(result.access_token).toBe("access123");
      expect(result.refresh_token).toBe("refresh456");
      expect(result.scope).toBe("files:read");
      expect(result.expires_at).toBeDefined();

      // client_secret_postが使用されていることを検証
      expect(oauth.ClientSecretPost).toHaveBeenCalledWith("test-secret");
    });

    test("client_secretなしの場合Noneを使用する", async () => {
      const publicClient: oauth.Client = {
        client_id: "public-id",
        token_endpoint_auth_method: "none",
      };

      vi.mocked(oauth.authorizationCodeGrantRequest).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "a",
            token_type: "bearer" as Lowercase<string>,
          }),
          { status: 200 },
        ),
      );
      vi.mocked(oauth.processAuthorizationCodeResponse).mockResolvedValueOnce({
        access_token: "a",
        token_type: "bearer" as Lowercase<string>,
      });

      const callbackUrl = new URL("tumiki://oauth/callback?code=c&state=s");
      await exchangeCodeForToken(
        authServer,
        publicClient,
        callbackUrl,
        "tumiki://oauth/callback",
        "v",
        "s",
      );

      expect(oauth.None).toHaveBeenCalled();
    });

    test("client_secret_basicの場合ClientSecretBasicを使用する", async () => {
      const basicClient: oauth.Client = {
        client_id: "basic-id",
        client_secret: "basic-secret",
        token_endpoint_auth_method: "client_secret_basic",
      };

      vi.mocked(oauth.authorizationCodeGrantRequest).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "a",
            token_type: "bearer" as Lowercase<string>,
          }),
          { status: 200 },
        ),
      );
      vi.mocked(oauth.processAuthorizationCodeResponse).mockResolvedValueOnce({
        access_token: "a",
        token_type: "bearer" as Lowercase<string>,
      });

      const callbackUrl = new URL("tumiki://oauth/callback?code=c&state=s");
      await exchangeCodeForToken(
        authServer,
        basicClient,
        callbackUrl,
        "tumiki://oauth/callback",
        "v",
        "s",
      );

      expect(oauth.ClientSecretBasic).toHaveBeenCalledWith("basic-secret");
    });

    test("Figma形式エラーレスポンスをRFC 6749形式に変換する", async () => {
      const client: oauth.Client = {
        client_id: "test-id",
        token_endpoint_auth_method: "none",
      };

      // Figma形式のエラーレスポンス
      vi.mocked(oauth.authorizationCodeGrantRequest).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: true,
            message: "invalid_code",
            i18n: "The authorization code is invalid",
          }),
          { status: 400 },
        ),
      );

      // processAuthorizationCodeResponseが呼ばれることを検証
      vi.mocked(oauth.processAuthorizationCodeResponse).mockImplementationOnce(
        async (_server, _client, response) => {
          const body = (await response.json()) as Record<string, unknown>;
          // RFC 6749形式に変換されていることを検証
          expect(body.error).toBe("invalid_code");
          expect(body.error_description).toBe(
            "The authorization code is invalid",
          );
          return { access_token: "", token_type: "" };
        },
      );

      const callbackUrl = new URL("tumiki://oauth/callback?code=c&state=s");
      await exchangeCodeForToken(
        authServer,
        client,
        callbackUrl,
        "tumiki://oauth/callback",
        "v",
        "s",
      );
    });

    test("token_endpoint_auth_methodが未指定でsecretありの場合ClientSecretPostを使用する", async () => {
      const client: oauth.Client = {
        client_id: "test-id",
        client_secret: "inferred-secret",
      };

      vi.mocked(oauth.authorizationCodeGrantRequest).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "a",
            token_type: "bearer" as Lowercase<string>,
          }),
          { status: 200 },
        ),
      );
      vi.mocked(oauth.processAuthorizationCodeResponse).mockResolvedValueOnce({
        access_token: "a",
        token_type: "bearer" as Lowercase<string>,
      });

      const callbackUrl = new URL("tumiki://oauth/callback?code=c&state=s");
      await exchangeCodeForToken(
        authServer,
        client,
        callbackUrl,
        "tumiki://oauth/callback",
        "v",
        "s",
      );

      expect(oauth.ClientSecretPost).toHaveBeenCalledWith("inferred-secret");
    });
  });

  describe("refreshAccessToken", () => {
    test("リフレッシュトークンでアクセストークンを更新する", async () => {
      const client: oauth.Client = {
        client_id: "test-id",
        client_secret: "test-secret",
        token_endpoint_auth_method: "client_secret_post",
      };

      vi.mocked(oauth.refreshTokenGrantRequest).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "new-access",
            token_type: "bearer" as Lowercase<string>,
            expires_in: 3600,
            refresh_token: "new-refresh",
          }),
          { status: 200 },
        ),
      );

      vi.mocked(oauth.processRefreshTokenResponse).mockResolvedValueOnce({
        access_token: "new-access",
        token_type: "bearer" as Lowercase<string>,
        expires_in: 3600,
        refresh_token: "new-refresh",
      });

      const result = await refreshAccessToken(
        authServer,
        client,
        "old-refresh-token",
      );

      expect(result.access_token).toBe("new-access");
      expect(result.refresh_token).toBe("new-refresh");
      expect(result.expires_at).toBeDefined();
    });
  });
});
