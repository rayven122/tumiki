import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { HonoEnv } from "../../../shared/types/honoEnv.js";
import { oauthTokenHandler } from "../commands/issueToken/handler.js";
import { clearKeycloakCache } from "../../../infrastructure/keycloak/keycloakConfig.js";

// vi.hoisted でモック関数とクラスを定義（ホイスティング問題を回避）
const {
  mockDiscovery,
  mockClientCredentialsGrant,
  mockRefreshTokenGrant,
  mockAuthorizationCodeGrant,
  MockResponseBodyError,
  mockSkipStateCheck,
} = vi.hoisted(() => {
  // テスト用 ResponseBodyError クラス（v6 のコンストラクタシグネチャに対応）
  class MockResponseBodyErrorClass extends Error {
    error: string;
    error_description?: string;
    status: number;
    response: Response;

    constructor(
      response: Response,
      cause: { error: string; error_description?: string },
    ) {
      super(cause.error_description ?? cause.error);
      this.name = "ResponseBodyError";
      this.error = cause.error;
      this.error_description = cause.error_description;
      this.status = response.status;
      this.response = response;
    }
  }

  return {
    mockDiscovery: vi.fn(),
    mockClientCredentialsGrant: vi.fn(),
    mockRefreshTokenGrant: vi.fn(),
    mockAuthorizationCodeGrant: vi.fn(),
    MockResponseBodyError: MockResponseBodyErrorClass,
    mockSkipStateCheck: Symbol("skipStateCheck"),
  };
});

// モックの設定
vi.mock("../../../shared/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

// openid-client v6 のモック
vi.mock("openid-client", () => ({
  discovery: mockDiscovery,
  // Configuration は serverMetadata() を持つモックオブジェクトを返す
  Configuration: vi.fn(() => ({
    serverMetadata: () => ({
      issuer: "https://keycloak.example.com/realms/tumiki",
      token_endpoint:
        "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
      jwks_uri:
        "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
    }),
  })),
  ClientSecretPost: vi.fn(() => "client_secret_post"),
  None: vi.fn(() => "none"),
  clientCredentialsGrant: mockClientCredentialsGrant,
  refreshTokenGrant: mockRefreshTokenGrant,
  authorizationCodeGrant: mockAuthorizationCodeGrant,
  ResponseBodyError: MockResponseBodyError,
  skipStateCheck: mockSkipStateCheck,
  allowInsecureRequests: vi.fn(),
}));

// テスト用の ServerMetadata
const mockServerMetadata = {
  issuer: "https://keycloak.example.com/realms/tumiki",
  token_endpoint:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/token",
  jwks_uri:
    "https://keycloak.example.com/realms/tumiki/protocol/openid-connect/certs",
};

// モック Configuration オブジェクトを作成するヘルパー
const createMockConfiguration = (metadata = mockServerMetadata) => ({
  serverMetadata: () => metadata,
});

describe("oauthTokenHandler", () => {
  let app: Hono<HonoEnv>;
  let originalKeycloakIssuer: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.post("/oauth/token", oauthTokenHandler);

    // 環境変数を保存
    originalKeycloakIssuer = process.env.KEYCLOAK_ISSUER;

    // テスト用の環境変数を設定
    process.env.KEYCLOAK_ISSUER = "https://keycloak.example.com/realms/tumiki";

    // キャッシュをクリア
    clearKeycloakCache();

    vi.clearAllMocks();

    // デフォルトの discovery モックを設定
    mockDiscovery.mockResolvedValue(createMockConfiguration());
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalKeycloakIssuer !== undefined) {
      process.env.KEYCLOAK_ISSUER = originalKeycloakIssuer;
    } else {
      delete process.env.KEYCLOAK_ISSUER;
    }

    // キャッシュをクリア
    clearKeycloakCache();
  });

  describe("バリデーション", () => {
    test("Content-Typeが不正な場合、400エラーを返す", async () => {
      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: "test-client",
          client_secret: "test-secret",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "Content-Type must be application/x-www-form-urlencoded",
      });
    });

    test("grant_typeが不正な場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "password");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "unsupported_grant_type",
        error_description:
          "Only authorization_code, client_credentials and refresh_token grant types are supported",
      });
    });

    test("client_idが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "client_id is required",
      });
    });

    test("client_secretが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "client_secret is required for client_credentials grant",
      });
    });

    test("refresh_token grantでrefresh_tokenが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "refresh_token is required for refresh_token grant",
      });
    });
  });

  describe("Client Credentials Grant", () => {
    test("正常なリクエストでトークンを取得できる", async () => {
      // openid-client v6 TokenEndpointResponse のモック
      const mockTokenResponse = {
        access_token: "eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc...",
        scope: "mcp:access",
      };

      mockClientCredentialsGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("scope", "mcp:access");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc...",
        scope: "mcp:access",
      });

      // v6: clientCredentialsGrant が正しく呼ばれたか確認
      expect(mockClientCredentialsGrant).toHaveBeenCalledWith(
        expect.anything(), // Configuration
        { scope: "mcp:access" },
      );
    });

    test("access_tokenとexpires_inがundefinedの場合、デフォルト値にフォールバックする", async () => {
      const mockTokenResponse = {
        access_token: undefined,
        token_type: "Bearer",
        expires_in: undefined,
        refresh_token: undefined,
        scope: undefined,
      };

      mockClientCredentialsGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "",
        token_type: "Bearer",
        expires_in: 0,
      });
    });

    test("Keycloakがエラーを返した場合、エラーレスポンスを返す", async () => {
      // openid-client v6 ResponseBodyError をスロー
      mockClientCredentialsGrant.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 401 }), {
          error: "invalid_client",
          error_description: "Invalid client credentials",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "invalid-client");
      formData.append("client_secret", "invalid-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_client",
        error_description: "Invalid client credentials",
      });
    });
  });

  describe("Refresh Token Grant", () => {
    test("正常なrefresh_tokenでトークンを更新できる", async () => {
      // openid-client v6 TokenEndpointResponse のモック
      const mockTokenResponse = {
        access_token: "new_eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "new_refresh_token",
        scope: "mcp:access",
      };

      mockRefreshTokenGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("refresh_token", "old_refresh_token");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "new_eyJhbGc...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "new_refresh_token",
        scope: "mcp:access",
      });

      // v6: refreshTokenGrant が正しく呼ばれたか確認
      expect(mockRefreshTokenGrant).toHaveBeenCalledWith(
        expect.anything(), // Configuration
        "old_refresh_token",
      );
    });

    test("access_tokenとexpires_inがundefinedの場合、デフォルト値にフォールバックする", async () => {
      const mockTokenResponse = {
        access_token: undefined,
        token_type: "Bearer",
        expires_in: undefined,
        refresh_token: undefined,
        scope: undefined,
      };

      mockRefreshTokenGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("refresh_token", "old_token");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "",
        token_type: "Bearer",
        expires_in: 0,
      });
    });

    test("無効なrefresh_tokenの場合、エラーレスポンスを返す", async () => {
      // openid-client v6 ResponseBodyError をスロー
      mockRefreshTokenGrant.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 401 }), {
          error: "invalid_grant",
          error_description: "Invalid refresh token",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");
      formData.append("refresh_token", "invalid_refresh_token");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid refresh token",
      });
    });
  });

  describe("Authorization Code Grant", () => {
    test("正常なauthorization_codeでトークンを取得できる", async () => {
      // openid-client v6 TokenEndpointResponse のモック
      const mockTokenResponse = {
        access_token: "eyJhbGc_auth_code...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc_refresh...",
        scope: "openid profile",
      };

      mockAuthorizationCodeGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("code", "test-authorization-code");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code_verifier", "test-code-verifier-12345");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "eyJhbGc_auth_code...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc_refresh...",
        scope: "openid profile",
      });

      // v6: authorizationCodeGrant が正しく呼ばれたか確認
      // 第2引数は code を含む URL オブジェクト
      // 第3引数は pkceCodeVerifier と expectedState を含む
      expect(mockAuthorizationCodeGrant).toHaveBeenCalledWith(
        expect.anything(), // Configuration
        expect.any(URL), // callbackUrl with code
        {
          pkceCodeVerifier: "test-code-verifier-12345",
          expectedState: mockSkipStateCheck, // state がない場合は skipStateCheck
        },
      );

      // URL に code と iss が含まれているか確認
      const calledUrl = mockAuthorizationCodeGrant.mock.calls[0][1] as URL;
      expect(calledUrl.searchParams.get("code")).toBe(
        "test-authorization-code",
      );
      // RFC 9207: issuer パラメータが追加されていることを確認
      expect(calledUrl.searchParams.get("iss")).toBe(
        "https://keycloak.example.com/realms/tumiki",
      );
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        "http://localhost:3000/callback",
      );
    });

    test("codeが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code_verifier", "test-code-verifier");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "code is required for authorization_code grant",
      });
    });

    test("redirect_uriが存在しない場合、400エラーを返す", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("code", "test-authorization-code");
      formData.append("code_verifier", "test-code-verifier");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "redirect_uri is required for authorization_code grant",
      });
    });

    test("code_verifierが存在しない場合、400エラーを返す（PKCE必須）", async () => {
      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("code", "test-authorization-code");
      formData.append("redirect_uri", "http://localhost:3000/callback");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "code_verifier is required for authorization_code grant (PKCE)",
      });
    });

    test("client_secretなしでも認証できる（Public Client）", async () => {
      const mockTokenResponse = {
        access_token: "eyJhbGc_public_client...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc_refresh...",
        scope: "openid",
      };

      mockAuthorizationCodeGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "public-client");
      // client_secret を省略（Public Client）
      formData.append("code", "test-authorization-code");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code_verifier", "test-code-verifier");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { access_token: string };
      expect(body.access_token).toBe("eyJhbGc_public_client...");
    });

    test("stateが提供された場合、URLに含めてexpectedStateで検証する", async () => {
      const mockTokenResponse = {
        access_token: "eyJhbGc_with_state...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc_refresh_state...",
        scope: "openid profile",
      };

      mockAuthorizationCodeGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("code", "test-authorization-code");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code_verifier", "test-code-verifier-12345");
      formData.append("state", "my-csrf-state-token");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "eyJhbGc_with_state...",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "eyJhbGc_refresh_state...",
        scope: "openid profile",
      });

      // state が提供された場合は expectedState に state 値が渡される（skipStateCheck ではない）
      expect(mockAuthorizationCodeGrant).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(URL),
        {
          pkceCodeVerifier: "test-code-verifier-12345",
          expectedState: "my-csrf-state-token",
        },
      );

      // URL に state パラメータが含まれていることを確認
      const calledUrl = mockAuthorizationCodeGrant.mock.calls[0][1] as URL;
      expect(calledUrl.searchParams.get("state")).toBe("my-csrf-state-token");
      expect(calledUrl.searchParams.get("code")).toBe(
        "test-authorization-code",
      );
      expect(calledUrl.searchParams.get("iss")).toBe(
        "https://keycloak.example.com/realms/tumiki",
      );
    });

    test("access_tokenとexpires_inがundefinedの場合、デフォルト値にフォールバックする", async () => {
      const mockTokenResponse = {
        access_token: undefined,
        token_type: "Bearer",
        expires_in: undefined,
        refresh_token: undefined,
        scope: undefined,
      };

      mockAuthorizationCodeGrant.mockResolvedValueOnce(mockTokenResponse);

      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("code", "test-code");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code_verifier", "test-verifier");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toStrictEqual({
        access_token: "",
        token_type: "Bearer",
        expires_in: 0,
      });
    });

    test("無効なcodeの場合、エラーレスポンスを返す", async () => {
      // openid-client v6 ResponseBodyError をスロー
      mockAuthorizationCodeGrant.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 401 }), {
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("client_id", "test-client");
      formData.append("code", "invalid-code");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code_verifier", "test-code-verifier");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_grant",
        error_description: "Invalid authorization code",
      });
    });
  });

  describe("エラーハンドリング", () => {
    test("KEYCLOAK_ISSUER環境変数が設定されていない場合、500エラーを返す", async () => {
      delete process.env.KEYCLOAK_ISSUER;

      // discovery がエラーをスローするようにモック
      mockDiscovery.mockRejectedValueOnce(
        new Error("KEYCLOAK_ISSUER environment variable is not set"),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toMatchObject({
        error: "server_error",
      });
    });

    test("ネットワークエラーが発生した場合、500エラーを返す", async () => {
      // discovery がネットワークエラーをスローするようにモック
      mockDiscovery.mockRejectedValueOnce(new Error("Network error"));

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "server_error",
        error_description: "Network error",
      });
    });

    test("ClientError（name=ClientError）が発生した場合、400エラーを返す", async () => {
      // ClientError をシミュレート（Error の name を "ClientError" に設定）
      const clientError = new Error("Validation failed: invalid parameter");
      clientError.name = "ClientError";
      mockClientCredentialsGrant.mockRejectedValueOnce(clientError);

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "invalid_request",
        error_description: "Validation failed: invalid parameter",
      });
    });

    test("Error以外のオブジェクトがスローされた場合、500エラーとInternal server errorを返す", async () => {
      // Error ではないオブジェクトをスロー
      mockClientCredentialsGrant.mockRejectedValueOnce("string error");

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "server_error",
        error_description: "Internal server error",
      });
    });

    test("ResponseBodyErrorでerror_descriptionがundefinedの場合、error.messageにフォールバックする", async () => {
      mockClientCredentialsGrant.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 401 }), {
          error: "invalid_client",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error_description: string };
      // error_description が undefined → error.message にフォールバック
      expect(body.error_description).toBe("invalid_client");
    });

    test("ResponseBodyErrorで未知のエラーコードの場合、server_errorにマッピングされる", async () => {
      // 未知のエラーコードを持つ ResponseBodyError をスロー
      mockClientCredentialsGrant.mockRejectedValueOnce(
        new MockResponseBodyError(new Response(null, { status: 400 }), {
          error: "custom_unknown_error",
          error_description: "Some custom error",
        }),
      );

      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");
      formData.append("client_id", "test-client");
      formData.append("client_secret", "test-secret");

      const res = await app.request("/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toStrictEqual({
        error: "server_error",
        error_description: "Some custom error",
      });
    });
  });
});
